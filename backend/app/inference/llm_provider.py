"""
LLM Provider Interface — Interface-First Design.
Swap MockLLMAdapter for GeminiAdapter or OpenAIAdapter in config without touching agent logic.
"""
import abc
import asyncio
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class LLMResponse:
    content: str
    model_used: str
    token_count: int
    latency_ms: float


class LLMProvider(abc.ABC):
    """Abstract interface for all LLM providers. Agents only depend on this contract."""

    @abc.abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.1) -> LLMResponse:
        """Sends a prompt and returns a structured response."""
        pass

    @abc.abstractmethod
    def get_model_name(self) -> str:
        pass


class MockLLMAdapter(LLMProvider):
    """
    Development-phase mock adapter.
    Returns rich, domain-realistic responses without calling an external API.
    Swap this class for GeminiAdapter in production by changing config/llm_config.py.
    """

    # Rich domain-specific response templates keyed by agent role
    _AGENT_RESPONSES: Dict[str, List[str]] = {
        "evidence": [
            "GraphRAG traversal completed across 3 knowledge hops. Target compound Compound_A demonstrates statistically significant activation (p=0.003) of Pathway_Y via Receptor_Z. Experimental evidence sourced from n=847 peer-reviewed publications indexed in the internal graph store. Mean effect size: Cohen's d = 1.42 (95% CI: 1.18–1.67). Pathway activation confirmed via three independent assay types: ELISA, Western blot, and RNA-seq differential expression (log₂FC = 2.31).",
            "Vector index retrieval returned 14 high-confidence documents (cosine similarity > 0.92). Evidence supports mechanistic plausibility: upregulation of MAPK/ERK pathway confirmed in 9/14 sources. Cross-domain graph traversal identified Receptor_Z as a dual-function node connecting both metabolic and inflammatory cascades.",
        ],
        "skeptic": [
            "CRITICAL AUDIT: Detected high publication bias risk (Egger's test p=0.041). Sample cohort is statistically underpowered (n=34 across 5 studies; minimum required: n=120 for 0.80 power at α=0.05). Three of nine supporting studies originate from a single research group — potential replication dependency. In-vitro-to-in-vivo translation gap unaddressed. No randomized controlled trials (RCTs) identified in the knowledge graph. Recommend confidence downgrade: 0.73 → 0.41.",
            "Methodological concern flagged: Two primary citations use retrospective cohort designs, introducing confounding variables. Activation metrics for Receptor_Z measured under non-physiological pH conditions (pH 6.2 vs. physiological pH 7.4). Temporal resolution of pathway activation measurements (72h post-exposure) does not capture acute signaling dynamics.",
        ],
        "connector": [
            "Multi-hop graph traversal (depth=4) reveals non-obvious cross-domain pathway: Compound_A → inhibits → MDM2 → releases → p53 → activates → PUMA → triggers → Pathway_Y. Secondary connector identified: Receptor_Z shares 73% structural homology with VEGFR-2, suggesting potential off-target angiogenic effects (confidence: 0.81). Oncological literature cross-reference found 3 analogous mechanisms in breast cancer models.",
            "Graph centrality analysis identifies Receptor_Z as a high-betweenness hub node (centrality score: 0.847) connecting 12 independent biological subgraphs. This structural position implies broad pleiotropic effects. Novel connection discovered: Compound_A shares a pharmacophore core with approved drug Imatinib (Tanimoto similarity: 0.78), indicating potential drug repurposing viability.",
        ],
        "quality": [
            "Methodology audit complete. CONSORT checklist compliance: 6/12 criteria met. Major deficiencies: (1) Allocation concealment not described in 4/7 studies; (2) Blinding of outcome assessment absent in all in-vivo experiments; (3) Protocol pre-registration absent (potential HARKing risk). Clinical Translation Readiness Level: TRL-3 (proof-of-concept). Recommended next step: IND-enabling study design with DMPK profiling.",
            "Research quality index: 0.62/1.0. Positive indicators: consistent cell-line model (HEK293T), reproducible assay conditions. Risk factors: No patient-derived organoid validation; species-specific receptor binding data absent for non-murine models. Regulatory compliance gap: ICH M3(R2) guidance not addressed for human safety pharmacology.",
        ],
    }

    async def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.1) -> LLMResponse:
        import time
        import random
        start = time.perf_counter()
        await asyncio.sleep(0.08)  # Simulate realistic API latency

        # Route to appropriate response template based on system_prompt keywords
        role = "evidence"
        prompt_lower = system_prompt.lower()
        if "skeptic" in prompt_lower or "bias" in prompt_lower:
            role = "skeptic"
        elif "connect" in prompt_lower or "path" in prompt_lower or "hub" in prompt_lower:
            role = "connector"
        elif "quality" in prompt_lower or "methodology" in prompt_lower or "audit" in prompt_lower:
            role = "quality"

        responses = self._AGENT_RESPONSES[role]
        content = random.choice(responses)
        latency = (time.perf_counter() - start) * 1000

        # Slightly vary content based on query context
        if user_prompt:
            # Inject query context into response naturally
            first_word = user_prompt[:20].split()[0] if user_prompt.split() else "Pathway_Y"
            content = content.replace("Pathway_Y", first_word)

        return LLMResponse(
            content=content,
            model_used="mock-llm-v1-dev",
            token_count=len(content.split()),
            latency_ms=round(latency, 2)
        )

    def get_model_name(self) -> str:
        return "mock-llm-v1-dev"


# === PRODUCTION ADAPTERS (wired in when ready) ===
# class GeminiAdapter(LLMProvider):
#     def __init__(self, api_key: str, model: str = "gemini-2.5-pro"):
#         import google.generativeai as genai
#         genai.configure(api_key=api_key)
#         self.model = genai.GenerativeModel(model)
#
#     async def complete(self, system_prompt, user_prompt, temperature=0.1) -> LLMResponse:
#         ... (drop-in replacement)


def get_llm_provider() -> LLMProvider:
    """Dependency injection factory. Replace MockLLMAdapter with production adapter here."""
    import os
    provider = os.getenv("LLM_PROVIDER", "mock")
    if provider == "mock":
        return MockLLMAdapter()
    # elif provider == "gemini":
    #     return GeminiAdapter(api_key=os.getenv("GEMINI_API_KEY"))
    return MockLLMAdapter()  # Fallback
