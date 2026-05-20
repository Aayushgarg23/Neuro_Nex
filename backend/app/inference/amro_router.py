import numpy as np
from typing import List

class AMROAgentRouter:
    """
    Ant-Colony-inspired Multi-Agent Routing Optimization (AMRO).
    Performs sub-millisecond agent routing using dynamic pheromone matrices.
    """
    def __init__(self, agent_nodes: List[str], decay_rate: float = 0.15):
        self.nodes = agent_nodes
        self.rho = decay_rate  # Pheromone evaporation factor: \rho
        self.num_nodes = len(agent_nodes)
        
        # Initialize pheromone concentration: \tau_{ij}
        self.pheromones = np.ones((self.num_nodes, self.num_nodes))

    def update_route_pheromone(self, source: str, target: str, performance_score: float):
        """
        Applies decay and reinforcements:
        \tau_{ij}(t+1) = (1 - \rho)\tau_{ij}(t) + \Delta\tau_{ij}
        """
        src_idx = self.nodes.index(source)
        tgt_idx = self.nodes.index(target)
        
        delta_tau = performance_score * 0.5
        self.pheromones[src_idx, tgt_idx] = (1.0 - self.rho) * self.pheromones[src_idx, tgt_idx] + delta_tau

    def route_speculatively(self, current_node: str) -> str:
        """
        Decides transition paths speculatively based on pheromone density.
        Uses a softmax conversion to resolve probabilities.
        """
        curr_idx = self.nodes.index(current_node)
        densities = self.pheromones[curr_idx, :]
        
        # Softmax conversion
        exp_densities = np.exp(densities - np.max(densities))
        probabilities = exp_densities / np.sum(exp_densities)
        
        selected_idx = np.random.choice(self.num_nodes, p=probabilities)
        return self.nodes[selected_idx]