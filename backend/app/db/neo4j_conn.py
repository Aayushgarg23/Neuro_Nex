"""
Neo4j GraphRepository — Repository Pattern Implementation.
Production-ready async Neo4j driver with proper session/result handling.
"""
import abc
import json
import os
import time
from typing import List, Dict, Any, Optional
from pathlib import Path


class GraphRepository(abc.ABC):
    @abc.abstractmethod
    async def write_finding(self, entity_a: str, relationship: str, entity_b: str, metadata: Dict[str, Any], provenance_hash: str) -> str:
        pass

    @abc.abstractmethod
    async def get_subgraph(self, entity: str, depth: int = 2) -> Dict[str, Any]:
        pass

    @abc.abstractmethod
    async def find_path(self, source: str, target: str) -> List[Dict[str, Any]]:
        pass

    @abc.abstractmethod
    async def get_all_nodes(self) -> Dict[str, Any]:
        pass


class InMemoryGraphRepository(GraphRepository):
    """Fallback in-memory repository."""
    STORE_PATH = Path(__file__).parent.parent.parent / "graph_store.json"

    def __init__(self):
        self._nodes: Dict[str, Dict] = {}
        self._edges: List[Dict] = []
        self._load_from_file()
        self._seed_demo_data()

    def _seed_demo_data(self):
        if self._nodes:
            return
        demo_nodes = [
            {"id": "compound_a", "label": "Compound_A", "type": "Drug", "properties": {"mw": 342.4}},
            {"id": "receptor_z", "label": "Receptor_Z", "type": "Protein", "properties": {"uniprot": "Q9Y6R0"}},
            {"id": "pathway_y",  "label": "Pathway_Y",  "type": "Pathway", "properties": {"kegg": "hsa04151"}},
            {"id": "disease_c",  "label": "Disease_C",  "type": "Disease", "properties": {"omim": "114480"}},
            {"id": "gene_mapk",  "label": "MAPK/ERK",   "type": "Gene",    "properties": {"entrez": "5594"}},
            {"id": "imatinib",   "label": "Imatinib",   "type": "Drug",    "properties": {"approved": True}},
        ]
        demo_edges = [
            {"source": "compound_a", "target": "receptor_z", "type": "ACTIVATES",  "confidence": 0.92},
            {"source": "receptor_z", "target": "pathway_y",  "type": "TRIGGERS",   "confidence": 0.88},
            {"source": "pathway_y",  "target": "disease_c",  "type": "LINKED_TO",  "confidence": 0.75},
            {"source": "gene_mapk",  "target": "pathway_y",  "type": "REGULATES",  "confidence": 0.95},
            {"source": "compound_a", "target": "imatinib",   "type": "SIMILAR_TO", "confidence": 0.78},
            {"source": "imatinib",   "target": "disease_c",  "type": "TREATS",     "confidence": 0.91},
        ]
        for n in demo_nodes:
            self._nodes[n["id"]] = n
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
        self.STORE_PATH.write_text(json.dumps({"nodes": self._nodes, "edges": self._edges}, indent=2))

    async def write_finding(self, entity_a, relationship, entity_b, metadata, provenance_hash):
        for eid, label in [(entity_a.lower().replace(" ", "_"), entity_a), (entity_b.lower().replace(" ", "_"), entity_b)]:
            if eid not in self._nodes:
                self._nodes[eid] = {"id": eid, "label": label, "type": "Entity", "properties": {}}
        edge_id = f"edge_{len(self._edges)}_{int(time.time())}"
        self._edges.append({
            "id": edge_id, "source": entity_a.lower().replace(" ", "_"), "target": entity_b.lower().replace(" ", "_"),
            "type": relationship, "confidence": metadata.get("confidence", 0.5),
            "provenance_hash": provenance_hash[:16] + "...", "timestamp": time.time(),
        })
        self._persist_to_file()
        return edge_id

    async def get_subgraph(self, entity, depth=2):
        eid = entity.lower().replace(" ", "_")
        edges = [e for e in self._edges if e["source"] == eid or e["target"] == eid]
        node_ids = {eid} | {e["source"] for e in edges} | {e["target"] for e in edges}
        return {"nodes": [self._nodes[n] for n in node_ids if n in self._nodes], "relationships": edges}

    async def find_path(self, source, target):
        return []

    async def get_all_nodes(self):
        return {"nodes": list(self._nodes.values()), "relationships": self._edges}


class Neo4jGraphRepository(GraphRepository):
    """Production Neo4j implementation using official async driver."""

    def __init__(self, uri: str, user: str, password: str, database: str = "neo4j"):
        from neo4j import AsyncGraphDatabase
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.database = database

    def _node_to_dict(self, node) -> Dict[str, Any]:
        return {
            "id": node.element_id,
            "label": node.get("name", node.element_id),
            "type": list(node.labels)[0] if node.labels else "Entity",
            "properties": dict(node),
        }

    def _rel_to_dict(self, rel) -> Dict[str, Any]:
        return {
            "id": rel.element_id,
            "source": rel.start_node.element_id,
            "target": rel.end_node.element_id,
            "type": rel.type,
            "confidence": rel.get("confidence", 0.8),
        }

    async def write_finding(self, entity_a, relationship, entity_b, metadata, provenance_hash):
        # Sanitize relationship name (Neo4j doesn't allow hyphens in rel type names)
        rel_type = relationship.upper().replace("-", "_").replace(" ", "_")
        async with self.driver.session(database=self.database) as session:
            query = (
                "MERGE (a:Entity {name: $a}) "
                "MERGE (b:Entity {name: $b}) "
                f"CREATE (a)-[r:{rel_type}]->(b) "
                "SET r += $props "
                "RETURN elementId(r) as eid"
            )
            props = {**metadata, "provenance": provenance_hash, "timestamp": time.time()}
            result = await session.run(query, a=entity_a, b=entity_b, props=props)
            record = await result.single()
            return str(record["eid"]) if record else ""

    async def get_subgraph(self, entity: str, depth: int = 2) -> Dict[str, Any]:
        async with self.driver.session(database=self.database) as session:
            query = "MATCH p=(n:Entity {name: $entity})-[*1..2]-() RETURN p"
            result = await session.run(query, entity=entity)
            nodes_dict, rels_list = {}, []
            async for record in result:
                path = record["p"]
                for node in path.nodes:
                    nid = node.element_id
                    if nid not in nodes_dict:
                        nodes_dict[nid] = self._node_to_dict(node)
                for rel in path.relationships:
                    rels_list.append(self._rel_to_dict(rel))
            return {"nodes": list(nodes_dict.values()), "relationships": rels_list}

    async def find_path(self, source: str, target: str) -> List[Dict[str, Any]]:
        async with self.driver.session(database=self.database) as session:
            query = "MATCH p=shortestPath((a:Entity {name: $src})-[*]-(b:Entity {name: $tgt})) RETURN p"
            result = await session.run(query, src=source, tgt=target)
            record = await result.single()
            if not record:
                return []
            path = record["p"]
            return [self._rel_to_dict(r) for r in path.relationships]

    async def get_all_nodes(self) -> Dict[str, Any]:
        async with self.driver.session(database=self.database) as session:
            # Fetch all nodes
            node_result = await session.run("MATCH (n:Entity) RETURN n LIMIT 150")
            nodes_dict = {}
            async for record in node_result:
                node = record["n"]
                nid = node.element_id
                nodes_dict[nid] = self._node_to_dict(node)

            # Fetch all relationships
            rel_result = await session.run("MATCH (a:Entity)-[r]->(b:Entity) RETURN a, r, b LIMIT 300")
            rels_list = []
            async for record in rel_result:
                # Also ensure both endpoint nodes are in nodes_dict
                for key in ["a", "b"]:
                    node = record[key]
                    nid = node.element_id
                    if nid not in nodes_dict:
                        nodes_dict[nid] = self._node_to_dict(node)
                rels_list.append(self._rel_to_dict(record["r"]))

            return {"nodes": list(nodes_dict.values()), "relationships": rels_list}


def get_graph_repository() -> GraphRepository:
    repo_type = os.getenv("GRAPH_REPO", "memory")
    if repo_type == "neo4j":
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USERNAME", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        database = os.getenv("NEO4J_DATABASE", "neo4j")
        return Neo4jGraphRepository(uri, user, password, database)
    return InMemoryGraphRepository()


_graph_repo: Optional[GraphRepository] = None

def get_singleton_graph_repo() -> GraphRepository:
    global _graph_repo
    if _graph_repo is None:
        _graph_repo = get_graph_repository()
    return _graph_repo
