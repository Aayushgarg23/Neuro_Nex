"""
Agent Council Configuration and Peer-Review Matrix.
Defines the specialized Aspect Verifiers (AVs) and their inter-agent
peer-review evaluation matrix for the Multi-Agent Verification (MAV) system.
"""
from typing import Dict, List
from dataclasses import dataclass


@dataclass
class AspectVerifier:
    agent_id: str
    display_name: str
    role_description: str
    system_prompt: str
    icon: str
    color: str
    weight_in_consensus: float  # Contribution to calibrated score
    reviews: List[str]          # Which other agents this AV reviews


# The Four Specialized Aspect Verifiers
COUNCIL_MEMBERS: Dict[str, AspectVerifier] = {
    "evidence_agent": AspectVerifier(
        agent_id="evidence_agent",
        display_name="Evidence Agent",
        role_description=(
            "Gathers and analyzes literal factual observations, experimental metrics, "
            "and statistical results from the knowledge graph."
        ),
        system_prompt=(
            "You are the Evidence Agent in a multi-agent research council. "
            "Your role is to retrieve and analyze factual evidence from the knowledge graph. "
            "Focus on: experimental results, statistical significance, effect sizes, "
            "and direct mechanistic evidence. Report findings with specific numerical values."
        ),
        icon="🔬",
        color="#10B981",
        weight_in_consensus=0.35,
        reviews=["skeptic_agent", "connector_agent"],
    ),
    "skeptic_agent": AspectVerifier(
        agent_id="skeptic_agent",
        display_name="Skeptic Agent",
        role_description=(
            "Checks for methodological bias, sample size constraints, "
            "statistical anomalies, and publication bias."
        ),
        system_prompt=(
            "You are the Skeptic Agent in a multi-agent research council. "
            "Your role is to critically evaluate methodology and identify weaknesses. "
            "Focus on: sample size adequacy, publication bias, confounding variables, "
            "statistical power, and replication concerns. Apply Egger's test criteria."
        ),
        icon="⚔️",
        color="#EF4444",
        weight_in_consensus=-0.15,  # Negative weight: high skepticism reduces score
        reviews=["evidence_agent", "quality_agent"],
    ),
    "connector_agent": AspectVerifier(
        agent_id="connector_agent",
        display_name="Connector Agent",
        role_description=(
            "Traces complex multi-hop paths across separate domains to find "
            "non-obvious relationships and cross-domain connections."
        ),
        system_prompt=(
            "You are the Connector Agent in a multi-agent research council. "
            "Your role is to traverse the knowledge graph and find non-obvious connections. "
            "Use multi-hop graph traversal (up to depth=4). Identify hub nodes, shared pathways, "
            "structural analogies, and drug repurposing opportunities."
        ),
        icon="🔗",
        color="#3B82F6",
        weight_in_consensus=0.30,
        reviews=["evidence_agent", "quality_agent"],
    ),
    "quality_agent": AspectVerifier(
        agent_id="quality_agent",
        display_name="Methodology Agent",
        role_description=(
            "Audits research designs and experimental setups for clinical "
            "translation risks and regulatory compliance."
        ),
        system_prompt=(
            "You are the Methodology Agent in a multi-agent research council. "
            "Your role is to audit experimental design and clinical translatability. "
            "Apply CONSORT checklist criteria. Assess: allocation concealment, blinding, "
            "pre-registration status, IND-enabling criteria, and ICH M3(R2) compliance. "
            "Assign Technology Readiness Level (TRL 1-9)."
        ),
        icon="📋",
        color="#8B5CF6",
        weight_in_consensus=0.20,
        reviews=["skeptic_agent", "evidence_agent"],
    ),
}

# Peer-Review Matrix: reviewer → reviewee → cross-evaluation weight
PEER_REVIEW_MATRIX: Dict[str, Dict[str, float]] = {
    "evidence_agent":  {"skeptic_agent": 0.3, "connector_agent": 0.4, "quality_agent": 0.3},
    "skeptic_agent":   {"evidence_agent": 0.5, "connector_agent": 0.2, "quality_agent": 0.3},
    "connector_agent": {"evidence_agent": 0.4, "skeptic_agent":  0.2, "quality_agent": 0.4},
    "quality_agent":   {"evidence_agent": 0.3, "skeptic_agent":  0.4, "connector_agent": 0.3},
}


def compute_peer_adjusted_confidence(
    raw_scores: Dict[str, float],
    peer_matrix: Dict[str, Dict[str, float]] = PEER_REVIEW_MATRIX,
) -> Dict[str, float]:
    """
    Applies the peer-review matrix to adjust individual agent confidence scores.
    Agents with high peer agreement receive a confidence boost; disagreement penalizes.

    Max adjustment is ±5% of the base score.
    """
    adjusted = {}
    for agent_id, base_score in raw_scores.items():
        peer_feedback = 0.0
        total_weight = 0.0
        for reviewer_id, review_targets in peer_matrix.items():
            if agent_id in review_targets and reviewer_id in raw_scores:
                weight = review_targets[agent_id]
                # Agreement score: 1.0 = perfect agreement, 0.0 = opposite
                agreement = 1.0 - abs(raw_scores[reviewer_id] - base_score)
                peer_feedback += weight * agreement
                total_weight += weight

        if total_weight > 0:
            # Max ±5% adjustment centred on 0.5 agreement
            peer_adjustment = (peer_feedback / total_weight - 0.5) * 0.1
            adjusted[agent_id] = max(0.0, min(1.0, base_score + peer_adjustment))
        else:
            adjusted[agent_id] = base_score

    return adjusted
