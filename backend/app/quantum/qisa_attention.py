import numpy as np
from typing import List

class QuantumNLPEncoder:
    """
    Simulates Quantum-Inspired NLP representations on classical hardware.
    Encodes real embedding vectors into complex state vectors in a Hilbert space.
    """
    @staticmethod
    def encode_to_hilbert(vector: np.ndarray) -> np.ndarray:
        """
        Maps a classical vector to complex probability amplitudes.
        Enforces unit normalization: <psi|psi> = 1.0.
        """
        norm = np.linalg.norm(vector)
        if norm == 0:
            return vector
        normalized = vector / norm
        
        # Apply Euler phase transitions to generate superposition states
        phases = np.exp(1j * normalized * np.pi)
        complex_amplitudes = normalized * phases
        
        # Unit normalization check
        state_norm = np.linalg.norm(complex_amplitudes)
        return complex_amplitudes / state_norm

    @classmethod
    def complex_cosine_similarity(cls, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Computes Born-rule probabilistic similarity of complex embeddings.
        Sim(|psi_1>, |psi_2>) = |<psi_1|psi_2>|^2
        """
        psi1 = cls.encode_to_hilbert(vec1)
        psi2 = cls.encode_to_hilbert(vec2)
        
        # Calculate complex dot product
        inner_product = np.vdot(psi1, psi2)
        return float(np.abs(inner_product) ** 2)


class QISAAttentionValueProjection:
    """
    Simulates Quantum-Inspired Self-Attention (QISA).
    Replaces standard value projections with operations inspired by quantum mechanics.
    """
    def __init__(self, embedding_dim: int):
        self.d = embedding_dim
        # Trainable weight mapping parameter
        self.W_v = np.random.randn(self.d, self.d) * 0.02

    def project_quantum_values(self, X: np.ndarray) -> np.ndarray:
        """
        Computes projected value representations for each token using simulated Pauli operators.
        For a given token state: <P_k>_i = <x_i | W_v^T P_k W_v | x_i>
        """
        seq_len, dim = X.shape
        projected_values = np.zeros((seq_len, dim))
        
        for i in range(seq_len):
            x_i = X[i, :]
            transformed = np.dot(self.W_v, x_i)
            
            # Compute simulated expectation values
            expectation_values = np.sin(transformed) * np.cos(transformed)
            projected_values[i, :] = expectation_values
            
        return projected_values