"""
NeuroNex FastAPI Gateway — v2.0
Async API layer exposing the multi-agent GraphRAG platform.

Endpoints:
  POST /api/v1/research          — Run the full 4-agent council pipeline
  GET  /api/v1/graph             — Return full knowledge graph for visualization
  GET  /api/v1/graph/subgraph    — Return entity-centred subgraph
  GET  /api/v1/graph/path        — Find shortest path between two entities
  GET  /api/v1/metrics/{session} — Token budget & cost metrics for a session
  GET  /api/v1/council           — Return council member metadata
  GET  /api/v1/health            — Health check with component status
"""
import os
import uuid
import time
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from app.agents.orchestrator import builder, get_state_checkpointer
from app.db.neo4j_conn import get_singleton_graph_repo
from app.inference.token_budget import budget_manager
from app.agents.council import COUNCIL_MEMBERS

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="NeuroNex API Gateway",
    version="2.0.0",
    description=(
        "Cognitive-Engineered Multi-Agent GraphRAG Platform. "
        "Powered by LangGraph, MockLLM (→ Gemini), InMemory (→ Neo4j), "
        "IBCT SHA-256 provenance, AMRO routing, and QAOA scheduling."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class ResearchRequest(BaseModel):
    query: str = Field(..., description="Research query to evaluate across the agent council.")
    thread_id: Optional[str] = Field(
        default=None,
        description="Session thread ID for multi-turn continuity. Auto-generated if omitted."
    )
    token_budget: int = Field(
        default=100_000,
        description="Maximum token budget for this session."
    )


class ResearchResponse(BaseModel):
    thread_id: str
    status: str
    score: float
    data: dict
    peer_evaluations: dict
    ibct_chain: list
    qaoa_schedule: list
    graph_node_written: str
    token_metrics: dict
    latency_ms: float


# ---------------------------------------------------------------------------
# Research endpoint — core pipeline
# ---------------------------------------------------------------------------
@app.post("/api/v1/research", response_model=ResearchResponse)
async def execute_research(payload: ResearchRequest):
    """
    Executes the full NeuroNex 4-agent council pipeline.

    Flow:
      1. Compile LangGraph with Postgres checkpointer (or in-memory fallback)
      2. Fan-out to 4 Aspect Verifier agents (parallel)
      3. Fan-in to Chairman Synthesis node
      4. Returns calibrated score, IBCT provenance chain, QAOA schedule, graph writeback
    """
    thread_id = payload.thread_id or str(uuid.uuid4())
    t_start = time.perf_counter()

    # Ensure session budget is registered
    budget_manager.get_or_create_session(thread_id, budget=payload.token_budget)

    try:
        # Try Postgres checkpointer; fall back to no-checkpoint in dev
        try:
            checkpointer = await get_state_checkpointer()
            compiled_graph = builder.compile(checkpointer=checkpointer)
        except Exception:
            # Postgres not running — compile without persistence (dev mode)
            compiled_graph = builder.compile()

        config = {"configurable": {"thread_id": thread_id}}

        result = await compiled_graph.ainvoke(
            {"query": payload.query, "thread_id": thread_id},
            config=config,
        )

        latency_ms = (time.perf_counter() - t_start) * 1000
        token_metrics = budget_manager.get_session_metrics(thread_id)

        return ResearchResponse(
            thread_id=thread_id,
            status="success",
            score=result.get("calibrated_score", 0.0),
            data=result.get("final_report", {}),
            peer_evaluations=result.get("peer_evaluations_compiled", {}),
            ibct_chain=result.get("ibct_chain_summary", []),
            qaoa_schedule=result.get("qaoa_schedule", []),
            graph_node_written=result.get("graph_node_written", ""),
            token_metrics=token_metrics,
            latency_ms=round(latency_ms, 2),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Graph visualization endpoints
# ---------------------------------------------------------------------------
@app.get("/api/v1/graph")
async def get_full_graph():
    """Returns all nodes and relationships for the knowledge graph visualization."""
    try:
        repo = get_singleton_graph_repo()
        data = await repo.get_all_nodes()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/graph/subgraph")
async def get_subgraph(
    entity: str = Query(..., description="Entity label to centre the subgraph on"),
    depth: int = Query(default=2, ge=1, le=4, description="Traversal depth"),
):
    """Returns a subgraph centred on the given entity label."""
    try:
        repo = get_singleton_graph_repo()
        data = await repo.get_subgraph(entity=entity, depth=depth)
        return {"status": "success", "entity": entity, "depth": depth, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/graph/path")
async def find_graph_path(
    source: str = Query(..., description="Source entity label"),
    target: str = Query(..., description="Target entity label"),
):
    """Finds and returns the shortest path between two entities in the knowledge graph."""
    try:
        repo = get_singleton_graph_repo()
        path = await repo.find_path(source=source, target=target)
        return {
            "status": "success",
            "source": source,
            "target": target,
            "path_length": len(path),
            "path": path,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Metrics endpoint
# ---------------------------------------------------------------------------
@app.get("/api/v1/metrics/{session_id}")
async def get_session_metrics(session_id: str):
    """Returns token budget usage and cost metrics for a given session."""
    metrics = budget_manager.get_session_metrics(session_id)
    if not metrics:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"status": "success", "metrics": metrics}


# ---------------------------------------------------------------------------
# Council metadata endpoint
# ---------------------------------------------------------------------------
@app.get("/api/v1/council")
async def get_council_members():
    """Returns metadata for all council members (used by frontend agent panels)."""
    members = [
        {
            "agent_id": m.agent_id,
            "display_name": m.display_name,
            "role_description": m.role_description,
            "icon": m.icon,
            "color": m.color,
            "weight_in_consensus": m.weight_in_consensus,
            "reviews": m.reviews,
        }
        for m in COUNCIL_MEMBERS.values()
    ]
    return {"status": "success", "council": members}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/v1/health")
async def health_check():
    """Returns platform health and component availability."""
    graph_ok = False
    try:
        repo = get_singleton_graph_repo()
        data = await repo.get_all_nodes()
        graph_ok = len(data.get("nodes", [])) > 0
    except Exception:
        pass

    return {
        "status": "healthy",
        "version": "2.0.0",
        "components": {
            "llm_provider": os.getenv("LLM_PROVIDER", "mock"),
            "graph_repo": os.getenv("GRAPH_REPO", "memory"),
            "graph_seeded": graph_ok,
            "postgres": os.getenv("DATABASE_URL", "not-configured"),
        },
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )