"""
LLM Provider — Fast, production-grade multi-model cascade.
Rate-limit aware: waits the retry-after time before switching models.
"""
import abc
import asyncio
import os
import re
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
                       max_tokens: int = 2048) -> LLMResponse:
        pass

    @abc.abstractmethod
    def get_model_name(self) -> str:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Gemini REST API Adapter
# ─────────────────────────────────────────────────────────────────────────────
class GeminiAdapter(LLMProvider):
    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    _RETRYABLE = {429, 500, 502, 503, 504}
    _FAST_FAIL  = {400, 401, 403, 404}

    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        self.api_keys = [k.strip() for k in api_key.split(",") if k.strip()]
        if not self.api_keys:
            raise ValueError("No valid API keys provided")
        self.model_name = model_name
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
        self._key_index = 0

    def _get_next_key(self):
        key = self.api_keys[self._key_index]
        self._key_index = (self._key_index + 1) % len(self.api_keys)
        return key

    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.1,
                       max_tokens: int = 2048) -> LLMResponse:
        start = time.perf_counter()
        url   = self._BASE_URL.format(model=self.model_name)

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature":     temperature,
                "maxOutputTokens": max_tokens,
                "topP": 0.95,
                "topK": 40,
            },
        }

        last_error = None
        for attempt in range(4):
            current_key = self._get_next_key()
            try:
                resp = await self._client.post(url, json=payload, params={"key": current_key})

                if resp.status_code in self._FAST_FAIL:
                    last_error = f"HTTP {resp.status_code} (permanent)"
                    logger.warning(f"[{self.model_name}] {last_error} — skipping retries")
                    break

                if resp.status_code == 429:
                    # Parallel agent requests trigger 429. Queue them up with sleep.
                    wait = (attempt + 1) * 2.5 + random.uniform(0.5, 1.5)
                    logger.warning(f"[{self.model_name}] 429 rate limit — queuing for {wait:.1f}s (attempt {attempt+1})")
                    await asyncio.sleep(wait)
                    last_error = "rate_limited"
                    continue  # Retry this model! Do not skip.

                if resp.status_code in self._RETRYABLE:
                    last_error = f"HTTP {resp.status_code}"
                    logger.warning(f"[{self.model_name}] {last_error} - {resp.text}")
                    await asyncio.sleep(2.0)
                    continue

                resp.raise_for_status()
                data = resp.json()

                candidates = data.get("candidates", [])
                if candidates:
                    parts   = candidates[0].get("content", {}).get("parts", [])
                    content = " ".join(p.get("text", "") for p in parts)
                else:
                    content = ""

                if not content.strip():
                    last_error = "empty_response"
                    break

                usage   = data.get("usageMetadata", {})
                tokens  = usage.get("totalTokenCount", len(content.split()))
                latency = (time.perf_counter() - start) * 1000

                logger.info(f"[{self.model_name}] ✅ {tokens} tokens in {latency:.0f}ms")
                return LLMResponse(
                    content=content,
                    model_used=self.model_name,
                    token_count=tokens,
                    latency_ms=round(latency, 2),
                )

            except httpx.TimeoutException:
                last_error = "timeout"
                logger.warning(f"[{self.model_name}] Timeout on attempt {attempt+1}/2")
            except httpx.HTTPStatusError as e:
                last_error = f"HTTP {e.response.status_code}"
                logger.warning(f"[{self.model_name}] {last_error} - {e.response.text}")
                if e.response.status_code in self._FAST_FAIL:
                    break
            except Exception as e:
                last_error = str(e)
                logger.error(f"[{self.model_name}] Unexpected error: {e}")

        logger.warning(f"Cascade: {self.model_name} failed → next")
        return LLMResponse(
            content=f"__ERROR__:{last_error}",
            model_used=self.model_name,
            token_count=0,
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
        )

    def get_model_name(self) -> str:
        return self.model_name


# ─────────────────────────────────────────────────────────────────────────────
# Cohere REST API Adapter — uses v2 API (cohere.com)
# ─────────────────────────────────────────────────────────────────────────────
class CohereAdapter(LLMProvider):
    # Cohere migrated from cohere.ai → cohere.com, v2 API uses messages array
    _BASE_URL  = "https://api.cohere.com/v2/chat"
    _RETRYABLE = {429, 500, 502, 503, 504}
    _FAST_FAIL = {400, 401, 403, 404}

    def __init__(self, api_key: str, model_name: str = "command-a-03-2025"):
        self.api_key    = api_key.strip()
        self.model_name = model_name
        self._client    = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.1,
                       max_tokens: int = 2048) -> LLMResponse:
        start = time.perf_counter()

        # Cohere v2 API uses OpenAI-compatible messages array
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system",  "content": system_prompt},
                {"role": "user",    "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens":  max_tokens,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        }

        last_error = None
        for attempt in range(4):
            try:
                resp = await self._client.post(self._BASE_URL, json=payload, headers=headers)

                if resp.status_code in self._FAST_FAIL:
                    # Log the actual error body for debugging
                    try:
                        err_body = resp.json()
                    except Exception:
                        err_body = resp.text[:200]
                    last_error = f"HTTP {resp.status_code}: {err_body}"
                    logger.warning(f"[{self.model_name}] {last_error} — skipping retries")
                    break

                if resp.status_code == 429:
                    wait = (attempt + 1) * 3.0 + random.uniform(0.5, 1.5)
                    logger.warning(f"[{self.model_name}] 429 rate limit — retrying in {wait:.1f}s")
                    await asyncio.sleep(wait)
                    last_error = "rate_limited"
                    continue

                if resp.status_code in self._RETRYABLE:
                    last_error = f"HTTP {resp.status_code}"
                    await asyncio.sleep(2.0)
                    continue

                resp.raise_for_status()
                data = resp.json()

                # v2 response: data["message"]["content"][0]["text"]
                content = ""
                msg = data.get("message", {})
                parts = msg.get("content", [])
                if parts and isinstance(parts, list):
                    content = parts[0].get("text", "")
                # fallback for older response shapes
                if not content:
                    content = data.get("text", "")

                if not content.strip():
                    last_error = "empty_response"
                    logger.warning(f"[{self.model_name}] Empty response body: {data}")
                    break

                usage  = data.get("usage", {})
                tokens = usage.get("tokens", {})
                tok_in  = tokens.get("input_tokens", 0)
                tok_out = tokens.get("output_tokens", 0)
                total   = tok_in + tok_out or len(content.split())

                latency = (time.perf_counter() - start) * 1000
                logger.info(f"[{self.model_name}] ✅ {total} tokens in {latency:.0f}ms")

                return LLMResponse(
                    content=content,
                    model_used=self.model_name,
                    token_count=total,
                    latency_ms=round(latency, 2),
                )

            except httpx.TimeoutException:
                last_error = "timeout"
                logger.warning(f"[{self.model_name}] Timeout on attempt {attempt+1}")
            except httpx.HTTPStatusError as e:
                last_error = f"HTTP {e.response.status_code}"
                if e.response.status_code in self._FAST_FAIL:
                    break
            except Exception as e:
                last_error = str(e)
                logger.error(f"[{self.model_name}] Unexpected: {e}")

        logger.warning(f"Cascade: {self.model_name} failed → next")
        return LLMResponse(
            content=f"__ERROR__:{last_error}",
            model_used=self.model_name,
            token_count=0,
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
        )

    def get_model_name(self) -> str:
        return self.model_name


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Model Cascade — tries models in order, switches on any error
# ─────────────────────────────────────────────────────────────────────────────
class MultiModelCascade:
    """
    Cascade order (best quality → smallest/fastest).
    Supports Gemini and Cohere.
    """

    def __init__(self, api_key: str, models: list[str] | None = None, provider: str = "gemini"):
        self.provider = provider
        
        if provider == "cohere":
            self.models = models or [
                "command-a-03-2025",
                "command-r7b-12-2024",
            ]
            self.adapters = [CohereAdapter(api_key=api_key, model_name=m) for m in self.models]
        else:
            self.models = models or [
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-1.5-flash",
            ]
            self.adapters = [GeminiAdapter(api_key=api_key, model_name=m) for m in self.models]

    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.15,
                       max_tokens: int = 2048) -> LLMResponse:
        """Try each model in cascade. First successful response wins."""
        errors = []
        for adapter in self.adapters:
            resp = await adapter.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if not resp.content.startswith("__ERROR__") and resp.content.strip():
                logger.info(f"Cascade: {adapter.model_name} ✅ ({resp.latency_ms:.0f}ms, {resp.token_count} tokens)")
                return resp

            errors.append(f"{adapter.model_name}: {resp.content[:60]}")
            logger.warning(f"Cascade: {adapter.model_name} failed → next")

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
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider == "cohere":
        api_key = os.getenv("COHERE_API_KEY", "")
        if not api_key:
            raise ValueError("COHERE_API_KEY is required.")
        return CohereAdapter(api_key=api_key, model_name="command-a-03-2025")
        
    if provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required.")
        return GeminiAdapter(api_key=api_key, model_name="gemini-2.0-flash")
        
    return MockLLMAdapter()


def get_cascade(api_key: str | None = None) -> MultiModelCascade:
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    if provider == "cohere":
        key = api_key or os.getenv("COHERE_API_KEY", "")
        return MultiModelCascade(api_key=key, provider="cohere")
    else:
        key = api_key or os.getenv("GEMINI_API_KEY", "")
        return MultiModelCascade(api_key=key, provider="gemini")


class MockLLMAdapter(LLMProvider):
    async def complete(self, system_prompt: str, user_prompt: str,
                       temperature: float = 0.1, max_tokens: int = 2048) -> LLMResponse:
        await asyncio.sleep(0.05)
        return LLMResponse(
            content="⚠️ No LLM configured. Set LLM_PROVIDER=gemini and GEMINI_API_KEY in .env",
            model_used="mock", token_count=20, latency_ms=50.0,
        )

    def get_model_name(self) -> str:
        return "mock"
