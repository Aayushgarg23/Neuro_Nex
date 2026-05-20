import os
import operator
from typing import Dict, Any, List, Annotated
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from psycopg.rows import dict_row

# Stateful contract schemas
class VerificationReport(BaseModel):
    findings: str = Field(description="Aspect-specific findings.")
    citations: List[str] = Field(description="Provenance source list.")
    confidence: float = Field(description="Localized confidence score.")

class AgentState(BaseModel):
    messages: Annotated[list, operator.add] = Field(default_factory=list)
    query: str = Field(default="")
    council_reviews: Dict = Field(default_factory=dict)
    final_report: Dict[str, Any] = Field(default_factory=dict)
    calibrated_score: float = Field(default=0.0)

# Specialized Aspect Verifier Nodes [1]
async def evidence_agent_node(state: AgentState) -> Dict[str, Any]:
    return {
        "council_reviews": {
            "evidence_agent": VerificationReport(
                findings="Target experimental pathways are physically active. Verified direct matches.[1]",
                citations=["Paper-992"],
                confidence=0.92
            )
        }
    }

async def skeptic_agent_node(state: AgentState) -> Dict[str, Any]:
    return {
        "council_reviews": {
            "skeptic_agent": VerificationReport(
                findings="Extremely low sample cohort (n=12) with high publication bias.[1]",
                citations=["Paper-992"],
                confidence=0.53
            )
        }
    }

async def connector_agent_node(state: AgentState) -> Dict[str, Any]:
    return {
        "council_reviews": {
            "connector_agent": VerificationReport(
                findings="Compound_A connects to Disease_C via Receptor_B interactions.[1]",
                citations=["Paper-104"],
                confidence=0.84
            )
        }
    }

async def quality_agent_node(state: AgentState) -> Dict[str, Any]:
    return {
        "council_reviews": {
            "quality_agent": VerificationReport(
                findings="Testing is strictly in vitro. High danger profile for human translation.[1]",
                citations=["Paper-104"],
                confidence=0.62
            )
        }
    }

# Consensus Synthesis Node
async def synthesis_chairman_node(state: AgentState) -> Dict[str, Any]:
    reviews = state.council_reviews
    e = reviews.get("evidence_agent").confidence if "evidence_agent" in reviews else 0.5
    s = reviews.get("skeptic_agent").confidence if "skeptic_agent" in reviews else 0.5
    c = reviews.get("connector_agent").confidence if "connector_agent" in reviews else 0.5
    q = reviews.get("quality_agent").confidence if "quality_agent" in reviews else 0.5
    
    # Calibrated synthesis objective formulation
    alpha, beta, gamma = 0.6, 0.4, 0.2
    score = (alpha * e) + (beta * c) - (gamma * s * (1.0 - q))
    final_score = max(0.0, min(1.0, score))
    
    verdict = "Consensus Synthesized: Plausible path, but high clinical transition risks.[1]"
    
    return {
        "final_report": {
            "consensus_verdict": verdict,
            "confidence_score": final_score,
            "citations_found": ["Paper-992", "Paper-104"]
        },
        "calibrated_score": final_score
    }

# Compile Graph [5]
builder = StateGraph(AgentState)
builder.add_node("evidence_agent", evidence_agent_node)
builder.add_node("skeptic_agent", skeptic_agent_node)
builder.add_node("connector_agent", connector_agent_node)
builder.add_node("quality_agent", quality_agent_node)
builder.add_node("chairman_synthesis", synthesis_chairman_node)

builder.add_edge(START, "evidence_agent")
builder.add_edge(START, "skeptic_agent")
builder.add_edge(START, "connector_agent")
builder.add_edge(START, "quality_agent")

builder.add_edge("evidence_agent", "chairman_synthesis")
builder.add_edge("skeptic_agent", "chairman_synthesis")
builder.add_edge("connector_agent", "chairman_synthesis")
builder.add_edge("quality_agent", "chairman_synthesis")
builder.add_edge("chairman_synthesis", END)

async def get_state_checkpointer() -> AsyncPostgresSaver:
    """
    Configures and returns the Async PostgreSQL state checkpointer.[4]
    Requires autocommit=True and row_factory=dict_row configured for safety.[4]
    """
    db_uri = os.getenv("DATABASE_URL", "postgresql://postgres:postgres_pass@localhost:5432/neuronex_db")
    
    conn = await AsyncConnection.connect(db_uri, autocommit=True, row_factory=dict_row)
    checkpointer = AsyncPostgresSaver(conn)
    await checkpointer.setup()  # Run migrations automatically
    return checkpointer