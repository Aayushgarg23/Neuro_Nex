"""
Token Budget Manager — Tracks per-session LLM token usage and dynamically
downgrades/upgrades model tier based on remaining budget thresholds.
"""
import time
from typing import Dict, Any
from dataclasses import dataclass, field


@dataclass
class ModelTier:
    name: str
    max_tokens_per_call: int
    tokens_per_second: float  # Throughput estimate
    cost_per_1k_tokens: float  # USD
    quality_score: float  # 0.0 - 1.0


# Model tier registry — pluggable
MODEL_TIERS = {
    "premium":  ModelTier("gemini-2.5-pro",       8192, 120.0,   0.035, 1.0),
    "standard": ModelTier("gemini-2.0-flash",      4096, 240.0,   0.008, 0.82),
    "fast":     ModelTier("gemini-2.0-flash-lite", 2048, 480.0,   0.002, 0.71),
    "mock":     ModelTier("mock-llm-v1-dev",       4096, 10000.0, 0.0,   0.65),
}


@dataclass
class SessionBudget:
    session_id: str
    total_token_budget: int = 100_000
    tokens_used: int = 0
    calls_made: int = 0
    total_cost_usd: float = 0.0
    current_tier: str = "mock"
    tier_switches: list = field(default_factory=list)
    created_at: float = field(default_factory=time.time)

    @property
    def tokens_remaining(self) -> int:
        return self.total_token_budget - self.tokens_used

    @property
    def utilization_pct(self) -> float:
        return (self.tokens_used / self.total_token_budget) * 100


class TokenBudgetManager:
    """
    Tracks token consumption per session and dynamically selects the optimal
    model tier based on remaining budget and quality requirements.

    Thresholds:
    - >80% budget remaining → Premium tier
    - 40-80% budget remaining → Standard tier
    - <40% budget remaining → Fast tier
    - Any mock env → Mock tier
    """

    # Budget utilization thresholds for tier switching
    PREMIUM_THRESHOLD = 0.20   # Use premium when <20% used
    STANDARD_THRESHOLD = 0.60  # Use standard when <60% used
    # Beyond 60% used → fast tier

    def __init__(self):
        self._sessions: Dict[str, SessionBudget] = {}

    def get_or_create_session(self, session_id: str, budget: int = 100_000) -> SessionBudget:
        if session_id not in self._sessions:
            self._sessions[session_id] = SessionBudget(
                session_id=session_id,
                total_token_budget=budget
            )
        return self._sessions[session_id]

    def record_usage(self, session_id: str, tokens: int, model_used: str):
        """Record token usage and update cost estimates."""
        session = self.get_or_create_session(session_id)
        session.tokens_used += tokens
        session.calls_made += 1

        tier_config = MODEL_TIERS.get(self._get_tier_name(model_used))
        if tier_config:
            session.total_cost_usd += (tokens / 1000) * tier_config.cost_per_1k_tokens

        # Evaluate if tier switch needed
        new_tier = self._select_tier(session)
        if new_tier != session.current_tier:
            session.tier_switches.append({
                "from": session.current_tier,
                "to": new_tier,
                "at_utilization_pct": session.utilization_pct,
                "at_token": session.tokens_used,
            })
            session.current_tier = new_tier

    def _select_tier(self, session: SessionBudget) -> str:
        """Select optimal tier based on utilization."""
        import os
        if os.getenv("LLM_PROVIDER", "mock") == "mock":
            return "mock"
        utilization = session.tokens_used / session.total_token_budget
        if utilization < self.PREMIUM_THRESHOLD:
            return "premium"
        elif utilization < self.STANDARD_THRESHOLD:
            return "standard"
        return "fast"

    def _get_tier_name(self, model_name: str) -> str:
        for tier, config in MODEL_TIERS.items():
            if config.name == model_name:
                return tier
        return "mock"

    def get_session_metrics(self, session_id: str) -> Dict[str, Any]:
        session = self._sessions.get(session_id)
        if not session:
            return {}
        return {
            "session_id": session.session_id,
            "tokens_used": session.tokens_used,
            "tokens_remaining": session.tokens_remaining,
            "utilization_pct": round(session.utilization_pct, 2),
            "calls_made": session.calls_made,
            "total_cost_usd": round(session.total_cost_usd, 6),
            "current_tier": session.current_tier,
            "tier_model": MODEL_TIERS[session.current_tier].name,
            "tier_switches": session.tier_switches,
        }


# Singleton instance
budget_manager = TokenBudgetManager()
