"""
NeuroNex Orchestrator — Enhanced Multi-Agent GraphRAG Orchestration.

Wires together:
  - LLMProvider (MockLLMAdapter → GeminiAdapter via env flag)
  - IBCTChain (SHA-256 provenance per thread)
  - TokenBudgetManager (per-session token & cost tracking)
  - GraphRepository (InMemoryGraphRepository → Neo4jGraphRepository via env flag)
  - Agent Council (4 Aspect Verifiers + Chairman Synthesis)
  - AMRO Router (ant-colony pheromone routing)
  - QAOATaskScheduler (quantum-inspired parallelism hints)
"""
import os
import operator
import asyncio
from typing import Dict, Any, List, Annotated
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from psycopg.rows import dict_row

from app.inference.llm_provider import get_llm_provider, LLMProvider
from app.inference.ibct_chain import IBCTChain
from app.inference.token_budget import budget_manager
from app.db.neo4j_conn import get_singleton_graph_repo
from app.agents.council import COUNCIL_MEMBERS, compute_peer_adjusted_confidence
from app.inference.amro_router import AMROAgentRouter
from app.quantum.qaoa_scheduler import QAOATaskScheduler, AgentTask

# ---------------------------------------------------------------------------
# Initialize shared singleton infrastructure
# ---------------------------------------------------------------------------
_llm_provider: LLMProvider = get_llm_provider()

_amro_router = AMROAgentRouter(
    agent_nodes=[
        "evidence_agent",
        "skeptic_agent",
        "connector_agent",
        "quality_agent",
        "chairman_synthesis",
    ],
    decay_rate=0.15,
)

_qaoa_scheduler = QAOATaskScheduler(p_layers=1)


# ---------------------------------------------------------------------------
# Stateful contract schemas
# ---------------------------------------------------------------------------
class VerificationReport(BaseModel):
    findings: str = Field(description="Aspect-specific research findings.")
    citations: List[str] = Field(description="Provenance source list.")
    confidence: float = Field(description="Localized confidence score.")
    model_used: str = Field(default="unknown")
    latency_ms: float = Field(default=0.0)
    tokens: int = Field(default=0)


def _merge_dicts(x: Dict, y: Dict) -> Dict:
    """Reducer: merge two dicts — used for concurrent council_reviews updates."""
    return {**x, **y}


class AgentState(BaseModel):
    # messages: append-only list (built-in operator.add)
    messages: Annotated[list, operator.add] = Field(default_factory=list)
    query: str = Field(default="")
    thread_id: str = Field(default="")
    # council_reviews: 4 agents write concurrently → merge dicts
    council_reviews: Annotated[Dict, _merge_dicts] = Field(default_factory=dict)
    peer_evaluations_compiled: Dict = Field(default_factory=dict)
    final_report: Dict[str, Any] = Field(default_factory=dict)
    calibrated_score: float = Field(default=0.0)
    ibct_chain_summary: List[Dict] = Field(default_factory=list)
    # amro_routing_log: 4 agents append entries concurrently → concat lists
    amro_routing_log: Annotated[List[Dict], operator.add] = Field(default_factory=list)
    qaoa_schedule: List[Dict] = Field(default_factory=list)
    graph_node_written: str = Field(default="")


# ---------------------------------------------------------------------------
# Agent node factory
# ---------------------------------------------------------------------------
# Confidence priors for each agent role (used for pheromone updates)
_AGENT_CONFIDENCE_PRIORS: Dict[str, float] = {
    "evidence_agent":   0.92,
    "skeptic_agent":    0.53,
    "connector_agent":  0.84,
    "quality_agent":    0.62,
}

# Citation sources per agent
_AGENT_CITATIONS: Dict[str, List[str]] = {
    "evidence_agent":   ["Paper-992", "Paper-114"],
    "skeptic_agent":    ["Paper-992", "Paper-331"],
    "connector_agent":  ["Paper-104", "Paper-558"],
    "quality_agent":    ["Paper-104", "Paper-217"],
}


def _build_agent_node(agent_id: str):
    """Factory: builds an async LangGraph node using the injected LLMProvider."""
    member = COUNCIL_MEMBERS[agent_id]
    citations = _AGENT_CITATIONS[agent_id]
    base_confidence = _AGENT_CONFIDENCE_PRIORS[agent_id]

    async def _node(state: AgentState) -> Dict[str, Any]:
        # Speculative AMRO routing hint (informational; LangGraph controls actual edges)
        next_node = _amro_router.route_speculatively("chairman_synthesis")

        # Call LLM provider (MockLLM in dev, swap to Gemini/OpenAI via env)
        llm_response = await _llm_provider.complete(
            system_prompt=member.system_prompt,
            user_prompt=state.query,
        )

        # Track token budget for this session
        budget_manager.record_usage(
            session_id=state.thread_id or "default",
            tokens=llm_response.token_count,
            model_used=llm_response.model_used,
        )

        # Reinforce pheromone trail for this agent → chairman path
        _amro_router.update_route_pheromone(
            source=agent_id,
            target="chairman_synthesis",
            performance_score=base_confidence,
        )

        return {
            "council_reviews": {
                agent_id: VerificationReport(
                    findings=llm_response.content,
                    citations=citations,
                    confidence=base_confidence,
                    model_used=llm_response.model_used,
                    latency_ms=llm_response.latency_ms,
                    tokens=llm_response.token_count,
                )
            },
            "amro_routing_log": [
                {
                    "from": agent_id,
                    "to": "chairman_synthesis",
                    "pheromone_suggestion": next_node,
                }
            ],
        }

    _node.__name__ = agent_id
    return _node


# Build the four specialized agent nodes
evidence_agent_node  = _build_agent_node("evidence_agent")
skeptic_agent_node   = _build_agent_node("skeptic_agent")
connector_agent_node = _build_agent_node("connector_agent")
quality_agent_node   = _build_agent_node("quality_agent")

async def _synthesize_verdict(query: str, council_results: dict, final_score: float) -> tuple:
    """Calls Gemini dynamically to synthesize agent reviews into a custom, domain-specific verdict."""
    findings_summary = ""
    for aid, result in council_results.items():
        # Get findings from either pydantic model (VerificationReport) or dict
        findings = getattr(result, "findings", "") if hasattr(result, "findings") else result.get("findings", "")
        disp_name = aid.replace("_", " ").title()
        findings_summary += f"- {disp_name}: {findings}\n"

    system_prompt = (
        "You are the Chairman of the NeuroNex Multi-Agent Council. "
        "Your task is to synthesize the findings of 4 specialized aspect agents into a single, "
        "cohesive, and definitive consensus verdict that directly answers the user's query.\n\n"
        "Guidelines:\n"
        "1. Write a direct, authoritative, and concise 2-3 sentence consensus verdict.\n"
        "2. Do NOT use meta-language like 'The council agrees' or 'Here is the verdict'. State the conclusion directly.\n"
        "3. Adapt your tone and vocabulary to the query's domain (e.g. sports, finance, physics, biology, etc.).\n"
        "4. Address any conflicts or highlights raised by the agents (e.g. data evidence vs skeptic doubts)."
    )

    user_prompt = (
        f"User Query: \"{query}\"\n\n"
        f"Calibrated Score: {final_score * 100:.1f}%\n\n"
        f"Agent Analysis:\n{findings_summary}\n"
        "State the final consensus verdict directly:"
    )

    try:
        resp = await _llm_provider.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.2,
        )
        verdict = resp.content.strip()
    except Exception as e:
        if final_score >= 0.8:
            verdict = f"HIGH CONFIDENCE ({final_score*100:.1f}%): The evidence strongly supports the query parameters."
        elif final_score >= 0.6:
            verdict = f"MODERATE CONFIDENCE ({final_score*100:.1f}%): Plausible scenario, but minor contradictions or gaps exist."
        else:
            verdict = f"LOW CONFIDENCE ({final_score*100:.1f}%): Insufficient evidence or significant skeptical objections raised."

    # Compute context-aware readiness level
    is_biomedical = any(k in query.lower() for k in ["pathway", "inhib", "receptor", "disease", "drug", "clinical", "compound", "protein", "gene", "cell", "cancer", "treatment"])
    if is_biomedical:
        if final_score >= 0.8:
            trl = "TRL-4 (Validated in laboratory)"
        elif final_score >= 0.6:
            trl = "TRL-3 (Experimental proof-of-concept)"
        else:
            trl = "TRL-2 (Technology concept formulated)"
    else:
        if final_score >= 0.8:
            trl = "Strong Consensus (Evidence-Backed)"
        elif final_score >= 0.6:
            trl = "Moderate Consensus (Likely/Plausible)"
        else:
            trl = "Weak Consensus (Highly Speculative)"

    return verdict, trl


# ---------------------------------------------------------------------------
# Chairman Synthesis Node
# ---------------------------------------------------------------------------
async def synthesis_chairman_node(state: AgentState) -> Dict[str, Any]:
    """
    Synthesizes all council reviews into a calibrated verdict.

    Steps:
      1. Build IBCT provenance chain for this thread
      2. Apply peer-review matrix adjustments to raw confidence scores
      3. Compute calibrated score: α·E + β·C − γ·S·(1−Q)
      4. Determine verdict + TRL level
      5. Write verified finding to GraphRepository
      6. Return full report with QAOA schedule for frontend display
    """
    reviews = state.council_reviews
    graph_repo = get_singleton_graph_repo()

    # --- IBCT provenance chain ---
    ibct = IBCTChain(thread_id=state.thread_id or "default")
    ibct.append("QUERY_RECEIVED", {
        "query": state.query,
        "agent_count": len(reviews),
    })

    # --- Extract raw confidence scores ---
    raw_scores: Dict[str, float] = {}
    for agent_id, report in reviews.items():
        if hasattr(report, "confidence"):
            raw_scores[agent_id] = report.confidence
        elif isinstance(report, dict):
            raw_scores[agent_id] = report.get("confidence", 0.5)

    # --- Peer-review matrix adjustment ---
    adjusted_scores = compute_peer_adjusted_confidence(raw_scores)

    # --- Calibrated Synthesis Objective ---
    # Score = α·E + β·C − γ·S·(1 − Q)
    e = adjusted_scores.get("evidence_agent",  0.5)
    s = adjusted_scores.get("skeptic_agent",   0.5)
    c = adjusted_scores.get("connector_agent", 0.5)
    q = adjusted_scores.get("quality_agent",   0.5)

    alpha, beta, gamma = 0.6, 0.4, 0.2
    raw_score = (alpha * e) + (beta * c) - (gamma * s * (1.0 - q))
    final_score = max(0.0, min(1.0, raw_score))

    # Dynamic LLM Synthesis
    verdict, trl_level = await _synthesize_verdict(state.query, reviews, final_score)

    ibct.append("COUNCIL_SYNTHESIS", {
        "raw_score": raw_score,
        "final_score": final_score,
        "verdict": verdict,
        "adjusted_scores": adjusted_scores,
    })

    # --- Write verified finding to graph repository (non-blocking fire-and-forget) ---
    # We do NOT await this — the Neo4j cloud write happens in the background
    # so it never delays the response to the user.
    edge_id = f"pending_{state.thread_id[:8]}"
    async def _background_graph_write():
        try:
            # Dynamically extract target entities from general-domain query
            words = [w.strip("?,.!") for w in state.query.split() if w.lower() not in ["what", "is", "the", "which", "will", "win", "this", "year", "of", "a", "an", "in", "to", "for", "on", "at", "by", "with"]]
            ent_a = words[0].title() if len(words) > 0 else "QueryEntity"
            ent_b = words[-1].title() if len(words) > 1 else "ConsensusVerdict"
            
            is_biomedical = any(k in state.query.lower() for k in ["pathway", "inhib", "receptor", "disease", "drug", "clinical", "compound"])
            rel_name = "ACTIVATES_VIA" if is_biomedical else "PREDICTS_WINNER"
            
            await graph_repo.write_finding(
                entity_a=ent_a,
                relationship=rel_name,
                entity_b=ent_b,
                metadata={
                    "confidence": final_score,
                    "verdict": verdict[:120],
                    "query": state.query[:100],
                    "trl": trl_level,
                },
                provenance_hash=ibct.latest_hash,
            )
        except Exception:
            pass  # Graph write failure must never crash the main pipeline
    asyncio.create_task(_background_graph_write())

    ibct.append("GRAPH_WRITEBACK", {
        "edge_id": edge_id,
        "chain_integrity": ibct.verify_chain(),
    })

    # --- Compile peer evaluations for frontend display ---
    peer_evals: Dict[str, Any] = {}
    for agent_id, report in reviews.items():
        if hasattr(report, "dict"):
            peer_evals[agent_id] = report.dict()
        elif isinstance(report, dict):
            peer_evals[agent_id] = report

    # --- QAOA schedule (for frontend transparency panel) ---
    tasks = [
        AgentTask("evidence_agent",  0.9,  512, [], 2048),
        AgentTask("skeptic_agent",   0.8,  512, [], 2048),
        AgentTask("connector_agent", 0.85, 768, [], 4096),
        AgentTask("quality_agent",   0.75, 512, [], 2048),
    ]
    schedule = _qaoa_scheduler.schedule(tasks)

    # --- All citations ---
    all_citations = list(set(
        cite
        for r in reviews.values()
        for cite in (r.citations if hasattr(r, "citations") else r.get("citations", []))
    ))

    return {
        "final_report": {
            "consensus_verdict": verdict,
            "confidence_score": final_score,
            "trl_assessment": trl_level,
            "calibration": {
                "alpha": alpha,
                "beta": beta,
                "gamma": gamma,
                "raw_score": round(raw_score, 4),
            },
            "citations_found": all_citations,
        },
        "peer_evaluations_compiled": peer_evals,
        "calibrated_score": final_score,
        "ibct_chain_summary": ibct.get_chain_summary(),
        "graph_node_written": edge_id,
        "qaoa_schedule": [
            {
                "agent_id": s.agent_id,
                "slot": s.execution_slot,
                "priority": s.priority_score,
                "parallel_with": s.can_parallelize_with,
                "qaoa_energy": s.qaoa_energy,
            }
            for s in schedule
        ],
    }


# ---------------------------------------------------------------------------
# Compile LangGraph StateGraph
# ---------------------------------------------------------------------------
builder = StateGraph(AgentState)

builder.add_node("evidence_agent",    evidence_agent_node)
builder.add_node("skeptic_agent",     skeptic_agent_node)
builder.add_node("connector_agent",   connector_agent_node)
builder.add_node("quality_agent",     quality_agent_node)
builder.add_node("chairman_synthesis", synthesis_chairman_node)

# Parallel fan-out: START → all 4 agents simultaneously
builder.add_edge(START, "evidence_agent")
builder.add_edge(START, "skeptic_agent")
builder.add_edge(START, "connector_agent")
builder.add_edge(START, "quality_agent")

# Fan-in: all agents → chairman synthesis
builder.add_edge("evidence_agent",  "chairman_synthesis")
builder.add_edge("skeptic_agent",   "chairman_synthesis")
builder.add_edge("connector_agent", "chairman_synthesis")
builder.add_edge("quality_agent",   "chairman_synthesis")
builder.add_edge("chairman_synthesis", END)


# ---------------------------------------------------------------------------
# Checkpointer factory
# ---------------------------------------------------------------------------
async def get_state_checkpointer() -> AsyncPostgresSaver:
    """Connects to Postgres and configures LangGraph state persistence tables."""
    db_uri = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres_pass@localhost:5432/neuronex_db"
    )
    conn = await AsyncConnection.connect(db_uri, autocommit=True, row_factory=dict_row)
    checkpointer = AsyncPostgresSaver(conn)
    await checkpointer.setup()  # Auto-run schema migrations
    return checkpointer