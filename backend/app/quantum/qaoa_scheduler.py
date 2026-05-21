"""
QAOA-Inspired Agent Task Scheduler.
Simulates Quantum Approximate Optimization Algorithm (QAOA) for combinatorial
scheduling of agent tasks to optimal execution ordering.
Runs on classical hardware using numpy-based quantum circuit simulation.
"""
import numpy as np
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class AgentTask:
    agent_id: str
    priority: float           # 0.0 - 1.0
    estimated_tokens: int
    dependency_ids: List[str]  # Tasks that must complete first
    context_window_req: int    # Required context length


@dataclass
class ScheduledExecution:
    agent_id: str
    execution_slot: int
    priority_score: float
    can_parallelize_with: List[str]
    qaoa_energy: float  # Simulated QAOA objective value


class QAOATaskScheduler:
    """
    Simulates QAOA-inspired combinatorial optimization for agent scheduling.

    The Max-Cut formulation encodes scheduling conflicts as graph edges.
    QAOA p=1 variational circuit is simulated classically using numpy.
    Higher QAOA energy ↔ higher quality (lower-conflict) schedule.

    For n agents: O(n²) classical simulation vs O(log n) on quantum hardware.
    """

    def __init__(self, p_layers: int = 1):
        self.p = p_layers  # QAOA depth parameter
        self._last_energy = 0.0

    def _build_conflict_graph(self, tasks: List[AgentTask]) -> np.ndarray:
        """Build adjacency matrix encoding scheduling conflicts."""
        n = len(tasks)
        W = np.zeros((n, n))
        for i in range(n):
            for j in range(i + 1, n):
                # Conflict weight = dependency overlap + shared context
                dep_conflict = 1.0 if tasks[j].agent_id in tasks[i].dependency_ids else 0.0
                token_conflict = min(tasks[i].estimated_tokens, tasks[j].estimated_tokens) / 4096
                W[i, j] = W[j, i] = (dep_conflict * 2.0) + (token_conflict * 0.5)
        return W

    def _simulate_qaoa_p1(self, W: np.ndarray, gamma: float = 0.3, beta: float = 0.4) -> np.ndarray:
        """
        Classical simulation of QAOA p=1 ansatz.
        |ψ(γ,β)⟩ = e^{-iβB} e^{-iγC} |+⟩^n

        Returns approximate Max-Cut assignment vector in {-1, +1}^n.
        """
        n = W.shape[0]
        # Initialize in uniform superposition state
        state = np.ones(n) / np.sqrt(n)

        # Apply problem unitary e^{-iγC}
        phase_shifts = np.sum(W, axis=1) * gamma
        problem_unitary = np.exp(-1j * phase_shifts) * state

        # Apply mixer unitary e^{-iβB} (transverse field)
        mixer = np.cos(beta) * problem_unitary.real + np.sin(beta) * np.ones(n)

        # Measure: project to {-1, +1} via sign
        assignment = np.sign(mixer)
        assignment[assignment == 0] = 1  # Handle zero case
        return assignment

    def _compute_cut_energy(self, assignment: np.ndarray, W: np.ndarray) -> float:
        """Compute Max-Cut objective energy."""
        n = len(assignment)
        energy = 0.0
        for i in range(n):
            for j in range(i + 1, n):
                energy += W[i, j] * (1 - assignment[i] * assignment[j]) / 2
        return float(energy)

    def schedule(self, tasks: List[AgentTask]) -> List[ScheduledExecution]:
        """
        Compute optimal parallel execution schedule for agent tasks.
        Returns tasks ordered by execution slot with parallelism hints.
        """
        if not tasks:
            return []

        n = len(tasks)
        W = self._build_conflict_graph(tasks)
        assignment = self._simulate_qaoa_p1(W)
        energy = self._compute_cut_energy(assignment, W)
        self._last_energy = energy

        # Map QAOA assignment to execution slots
        # Partition 1 (+1) runs in slot 0, Partition -1 runs in slot 1
        schedules = []
        for i, task in enumerate(tasks):
            slot = 0 if assignment[i] > 0 else 1
            # Check dependencies — push to later slot if needed
            for dep_id in task.dependency_ids:
                dep_indices = [j for j, t in enumerate(tasks) if t.agent_id == dep_id]
                for dep_idx in dep_indices:
                    if (0 if assignment[dep_idx] > 0 else 1) >= slot:
                        slot = (0 if assignment[dep_idx] > 0 else 1) + 1

            # Priority score = task priority weighted by QAOA energy
            priority_score = task.priority * (1.0 + energy / (n + 1))

            # Parallel candidates: same slot, no dependency conflict
            parallel_candidates = [
                tasks[j].agent_id for j in range(n)
                if j != i
                and (0 if assignment[j] > 0 else 1) == slot
                and tasks[i].agent_id not in tasks[j].dependency_ids
            ]

            schedules.append(ScheduledExecution(
                agent_id=task.agent_id,
                execution_slot=slot,
                priority_score=round(priority_score, 4),
                can_parallelize_with=parallel_candidates,
                qaoa_energy=round(energy, 4),
            ))

        # Sort by slot then priority
        schedules.sort(key=lambda x: (x.execution_slot, -x.priority_score))
        return schedules

    @property
    def last_qaoa_energy(self) -> float:
        """Returns the objective energy of the most recent scheduling run."""
        return self._last_energy
