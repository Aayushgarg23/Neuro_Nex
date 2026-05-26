"""
LLM Provider — Production-grade with multi-model cascade fallback.

Architecture:
  1. GeminiAdapter — calls Gemini REST API directly (no SDK, no event-loop blocking)
  2. Multi-model cascade: if model A returns 429/503/500, instantly tries model B, C, D
  3. Configurable maxOutputTokens per call (agents use less, Chairman uses more)
  4. Exponential backoff on transient errors with jitter
"""
import abc
import asyncio
import os
import time
import random
import logging
from typing import Optional
from dataclasses import dataclass
import httpx

logger = logging.getLogger("neuronex.llm")


@dataclass
class LLMResponse:
    content: str
    model_used: str
    token_count: int
    latency_ms: float


class LLMProvider(abc.ABC):
    @abc.abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.1,
                       max_tokens: int = 4096) -> LLMResponse:
        pass

    @abc.abstractmethod
    def get_model_name(self) -> str:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Gemini REST API Adapter
# ─────────────────────────────────────────────────────────────────────────────
class GeminiAdapter(LLMProvider):
    """
    Direct REST call to Gemini API — genuinely async via httpx.
    Supports configurable max_tokens per call to control costs.
    """
    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    # Retryable HTTP status codes
    _RETRYABLE = {429, 500, 502, 503, 504}

    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model_name = model_name
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(90.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.1,
                       max_tokens: int = 4096) -> LLMResponse:
        start = time.perf_counter()
        url = self._BASE_URL.format(model=self.model_name)

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "topP": 0.95,
                "topK": 40,
            },
        }

        last_error = None
        # 2 retry attempts with exponential backoff (0.5s, 1.5s)
        for attempt in range(3):
            try:
                resp = await self._client.post(url, json=payload, params={"key": self.api_key})

                if resp.status_code in self._RETRYABLE:
                    last_error = f"HTTP {resp.status_code}"
                    wait = (0.5 * (2 ** attempt)) + random.uniform(0, 0.3)
                    logger.warning(f"[{self.model_name}] {last_error}, retry {attempt+1}/3 in {wait:.1f}s")
                    await asyncio.sleep(wait)
                    continue

                resp.raise_for_status()
                data = resp.json()

                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    content = " ".join(p.get("text", "") for p in parts)
                else:
                    content = ""

                usage = data.get("usageMetadata", {})
                tokens = usage.get("totalTokenCount", len(content.split()))

                latency_ms = (time.perf_counter() - start) * 1000
                return LLMResponse(
                    content=content,
                    model_used=self.model_name,
                    token_count=tokens,
                    latency_ms=round(latency_ms, 2),
                )

            except httpx.TimeoutException:
                last_error = "timeout"
                logger.warning(f"[{self.model_name}] Timeout, attempt {attempt+1}/3")
            except httpx.HTTPStatusError as e:
                last_error = f"HTTP {e.response.status_code}"
                logger.warning(f"[{self.model_name}] {last_error}")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"[{self.model_name}] Error: {last_error}")

            if attempt < 2:
                await asyncio.sleep(0.5 * (2 ** attempt))

        # All retries exhausted for this model
        latency_ms = (time.perf_counter() - start) * 1000
        return LLMResponse(
            content=f"__ERROR__:{last_error}",
            model_used=self.model_name,
            token_count=0,
            latency_ms=round(latency_ms, 2),
        )

    def get_model_name(self) -> str:
        return self.model_name


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Model Cascade — the 503-proof solution
# ─────────────────────────────────────────────────────────────────────────────
class MultiModelCascade:
    """
    Tries multiple Gemini models in sequence. If model A returns an error
    (429, 503, 500, timeout), instantly falls through to model B, then C.

    This ensures: even during a viva presentation with Google Gemini API spikes,
    at least ONE model will respond. The cascade order:

      1. gemini-2.0-flash       (best quality, free tier)
      2. gemini-2.0-flash-lite  (faster, lower quality, separate quota pool)
      3. gemini-1.5-flash       (older but stable, different capacity)
      4. gemini-1.5-flash-8b    (smallest, almost always available)

    If ALL 4 fail, returns a rich offline fallback response.
    """

    def __init__(self, api_key: str, models: list[str] | None = None):
        self.models = models or [
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
        ]
        self.adapters = [GeminiAdapter(api_key=api_key, model_name=m) for m in self.models]

    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.15,
                       max_tokens: int = 4096) -> LLMResponse:
        """Try each model in cascade. First successful response wins."""
        errors = []
        for adapter in self.adapters:
            resp = await adapter.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            # Check if this model succeeded
            if not resp.content.startswith("__ERROR__") and resp.content.strip():
                logger.info(f"Cascade: {adapter.model_name} succeeded ({resp.latency_ms:.0f}ms, {resp.token_count} tokens)")
                return resp

            errors.append(f"{adapter.model_name}: {resp.content}")
            logger.warning(f"Cascade: {adapter.model_name} failed, trying next...")

        # All models failed — return fallback marker
        logger.error(f"Cascade: ALL models failed: {errors}")
        return LLMResponse(
            content="__FALLBACK__",
            model_used="cascade-fallback",
            token_count=0,
            latency_ms=0.0,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Factory
# ─────────────────────────────────────────────────────────────────────────────
def get_llm_provider() -> LLMProvider:
    """Factory — selects provider based on environment variables."""
    provider = os.getenv("LLM_PROVIDER", "mock").lower()
    if provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required.")
        return GeminiAdapter(api_key=api_key, model_name=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"))
    return MockLLMAdapter()


def get_cascade(api_key: str | None = None) -> MultiModelCascade:
    """Create a cascade with the given or env API key."""
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    return MultiModelCascade(api_key=key)


class MockLLMAdapter(LLMProvider):
    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.1, max_tokens: int = 4096) -> LLMResponse:
        await asyncio.sleep(0.05)
        return LLMResponse(
            content="⚠️ No LLM configured. Set LLM_PROVIDER=gemini and GEMINI_API_KEY in .env",
            model_used="mock", token_count=20, latency_ms=50.0,
        )

    def get_model_name(self) -> str:
        return "mock"
