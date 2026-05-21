"""
PostgreSQL + pgvector Async Connection Pool.
Handles vector similarity search and state persistence.
"""
import os
from typing import List, Optional

# Lazy import pattern — avoids startup crash if psycopg not installed
try:
    import psycopg
    from psycopg_pool import AsyncConnectionPool
    PSYCOPG_AVAILABLE = True
except ImportError:
    PSYCOPG_AVAILABLE = False

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres_pass@localhost:5432/neuronex_db"
)

# Module-level pool (initialized on first call)
_pool: Optional[object] = None


async def get_pool():
    """Returns the async connection pool, initializing on first call."""
    global _pool
    if _pool is None and PSYCOPG_AVAILABLE:
        _pool = AsyncConnectionPool(
            conninfo=DATABASE_URL,
            min_size=2,
            max_size=10,
            kwargs={"row_factory": psycopg.rows.dict_row}
        )
        await _pool.open()
    return _pool


async def pgvector_similarity_search(
    query_embedding: List[float],
    table: str = "document_embeddings",
    top_k: int = 5,
    similarity_threshold: float = 0.7
) -> List[dict]:
    """
    Performs cosine similarity search using pgvector extension.
    Falls back gracefully if pool is unavailable (development mode).
    """
    pool = await get_pool()
    if pool is None:
        # Development fallback: return mock results
        return [
            {
                "id": f"mock-doc-{i}",
                "content": f"Mock document {i} matching query",
                "similarity": 0.95 - (i * 0.05),
                "source": f"Paper-{100 + i}"
            }
            for i in range(min(top_k, 3))
        ]

    try:
        async with pool.connection() as conn:
            vec_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
            rows = await conn.execute(
                f"""
                SELECT id, content, source_citation,
                       1 - (embedding <=> '{vec_str}'::vector) AS similarity
                FROM {table}
                WHERE 1 - (embedding <=> '{vec_str}'::vector) > %(threshold)s
                ORDER BY similarity DESC
                LIMIT %(top_k)s
                """,
                {"threshold": similarity_threshold, "top_k": top_k}
            )
            return [dict(row) for row in rows]
    except Exception as e:
        print(f"[pgvector] Search failed: {e}")
        return []


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
