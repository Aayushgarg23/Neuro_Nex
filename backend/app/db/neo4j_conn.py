"""
Neo4j GraphRepository — Repository Pattern Implementation.

Interface: GraphRepository (abstract)
Development implementation: InMemoryGraphRepository (JSON file stub)
Production implementation: Neo4jGraphRepository (live driver)

Transition: Point the factory to Neo4jGraphRepository when ready.
Zero changes required in agent/orchestrator logic.
"""
import abc
import json
import os
import time
from typing import List, Dict, Any, Optional
from pathlib import Path


class GraphRepository(abc.ABC):
    """Abstract interface for knowledge graph operations. Agents depend only on this contract."""

    @abc.abstractmethod
    async def write_finding(
        self,
        entity_a: str,
        relationship: str,
        entity_b: str,
        metadata: Dict[str, Any],
        provenance_hash: str
    ) -> str:
        """Write a verified finding as a graph edge. Returns the edge ID."""
        pass

    @abc.abstractmethod
    async def get_subgraph(self, entity: str, depth: int = 2) -> Dict[str, Any]:
        """Retrieve a subgraph centered on an entity up to given depth."""
        pass

    @abc.abstractmethod
    async def find_path(self, source: str, target: str) -> List[Dict[str, Any]]:
        """Find shortest path between two entities in the knowledge graph."""
        pass

    @abc.abstractmethod
    async def get_all_nodes(self) -> Dict[str, Any]:
        """Return all nodes and relationships in the graph (for visualization)."""
        pass


class InMemoryGraphRepository(GraphRepository):
    """
    Development stub — stores graph data in-memory and persists to a local JSON file.
    Produces realistic mock graph structures for frontend visualization.

    Upgrade path: Replace with Neo4jGraphRepository below.
    No changes to calling code (orchestrator.py) required.
    """

    STORE_PATH = Path(__file__).parent.parent.parent / "graph_store.json"

    def __init__(self):
        self._nodes: Dict[str, Dict] = {}
        self._edges: List[Dict] = []
        self._load_from_file()
        self._seed_demo_data()

    def _seed_demo_data(self):
        """Pre-populate with realistic biomedical graph for demonstration."""
        if self._nodes:
            return  # Already loaded from file

        demo_nodes = [
            {"id": "compound_a",  "label": "Compound_A",  "type": "Drug",     "properties": {"mw": 342.4,  "logP": 2.1}},
            {"id": "receptor_z",  "label": "Receptor_Z",  "type": "Protein",  "properties": {"uniprot": "Q9Y6R0"}},
            {"id": "pathway_y",   "label": "Pathway_Y",   "type": "Pathway",  "properties": {"kegg": "hsa04151"}},
            {"id": "disease_c",   "label": "Disease_C",   "type": "Disease",  "properties": {"omim": "114480"}},
            {"id": "gene_mapk",   "label": "MAPK/ERK",    "type": "Gene",     "properties": {"entrez": "5594"}},
            {"id": "compound_b",  "label": "Imatinib",    "type": "Drug",     "properties": {"approved": True}},
        ]
        demo_edges = [
            {"source": "compound_a", "target": "receptor_z", "type": "ACTIVATES",    "confidence": 0.92},
            {"source": "receptor_z", "target": "pathway_y",  "type": "TRIGGERS",     "confidence": 0.88},
            {"source": "pathway_y",  "target": "disease_c",  "type": "LINKED_TO",    "confidence": 0.75},
            {"source": "gene_mapk",  "target": "pathway_y",  "type": "REGULATES",    "confidence": 0.95},
            {"source": "compound_a", "target": "compound_b", "type": "SIMILAR_TO",   "confidence": 0.78},
            {"source": "compound_b", "target": "disease_c",  "type": "CONTRADICTS",  "confidence": 0.61},
        ]
        for node in demo_nodes:
            self._nodes[node["id"]] = node
        self._edges = demo_edges
        self._persist_to_file()

    def _load_from_file(self):
        if self.STORE_PATH.exists():
            try:
                data = json.loads(self.STORE_PATH.read_text())
                self._nodes = data.get("nodes", {})
                self._edges = data.get("edges", [])
            except Exception:
                self._nodes, self._edges = {}, []

    def _persist_to_file(self):
        self.STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.STORE_PATH.write_text(
            json.dumps({"nodes": self._nodes, "edges": self._edges}, indent=2)
        )

    async def write_finding(
        self,
        entity_a: str,
        relationship: str,
        entity_b: str,
        metadata: Dict[str, Any],
        provenance_hash: str
    ) -> str:
        # Upsert nodes
        for entity_id, label in [
            (entity_a.lower().replace(" ", "_"), entity_a),
            (entity_b.lower().replace(" ", "_"), entity_b),
        ]:
            if entity_id not in self._nodes:
                self._nodes[entity_id] = {
                    "id": entity_id,
                    "label": label,
                    "type": "Entity",
                    "properties": {}
                }

        edge_id = f"edge_{len(self._edges)}_{int(time.time())}"
        self._edges.append({
            "id": edge_id,
            "source": entity_a.lower().replace(" ", "_"),
            "target": entity_b.lower().replace(" ", "_"),
            "type": relationship,
            "confidence": metadata.get("confidence", 0.5),
            "provenance_hash": provenance_hash[:16] + "...",
            "timestamp": time.time(),
            **{k: v for k, v in metadata.items() if k != "confidence"},
        })
        self._persist_to_file()
        return edge_id

    async def get_subgraph(self, entity: str, depth: int = 2) -> Dict[str, Any]:
        entity_id = entity.lower().replace(" ", "_")
        relevant_edges = [
            e for e in self._edges
            if e["source"] == entity_id or e["target"] == entity_id
        ]
        relevant_node_ids = {entity_id}
        for e in relevant_edges:
            relevant_node_ids.add(e["source"])
            relevant_node_ids.add(e["target"])
        return {
            "nodes": [self._nodes[nid] for nid in relevant_node_ids if nid in self._nodes],
            "relationships": relevant_edges,
        }

    async def find_path(self, source: str, target: str) -> List[Dict[str, Any]]:
        src_id = source.lower().replace(" ", "_")
        tgt_id = target.lower().replace(" ", "_")
        # Simple BFS on edge list
        visited = {src_id}
        queue = [(src_id, [])]
        while queue:
            current, path = queue.pop(0)
            if current == tgt_id:
                return path
            for edge in self._edges:
                if edge["source"] == current and edge["target"] not in visited:
                    visited.add(edge["target"])
                    queue.append((edge["target"], path + [edge]))
        return []

    async def get_all_nodes(self) -> Dict[str, Any]:
        return {
            "nodes": list(self._nodes.values()),
            "relationships": self._edges,
        }


# === PRODUCTION ADAPTER (uncomment when Neo4j is live) ===
# class Neo4jGraphRepository(GraphRepository):
#     def __init__(self, uri: str, user: str, password: str):
#         from neo4j import AsyncGraphDatabase
#         self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
#
#     async def write_finding(self, entity_a, relationship, entity_b, metadata, provenance_hash) -> str:
#         async with self.driver.session() as session:
#             result = await session.run(
#                 "MERGE (a:Entity {name: $a}) MERGE (b:Entity {name: $b}) "
#                 "CREATE (a)-[r:" + relationship + " $props]->(b) RETURN id(r) as eid",
#                 a=entity_a, b=entity_b,
#                 props={**metadata, "provenance": provenance_hash}
#             )
#             record = await result.single()
#             return str(record["eid"])
#
#     async def get_subgraph(self, entity, depth=2): ...
#     async def find_path(self, source, target): ...
#     async def get_all_nodes(self): ...


def get_graph_repository() -> GraphRepository:
    """Factory — swap InMemoryGraphRepository for Neo4jGraphRepository here."""
    repo_type = os.getenv("GRAPH_REPO", "memory")
    if repo_type == "neo4j":
        raise NotImplementedError(
            "Wire Neo4jGraphRepository: set GRAPH_REPO=neo4j and uncomment Neo4jGraphRepository class."
        )
    return InMemoryGraphRepository()


# Singleton instance
_graph_repo: Optional[GraphRepository] = None


def get_singleton_graph_repo() -> GraphRepository:
    global _graph_repo
    if _graph_repo is None:
        _graph_repo = get_graph_repository()
    return _graph_repo
