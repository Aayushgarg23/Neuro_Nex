"""
NeuroNex RAG Pipeline — Real Retrieval-Augmented Generation
============================================================
Uses sentence-transformers (all-MiniLM-L6-v2) to embed text into vectors,
ChromaDB as the local vector store, and live APIs (Wikipedia, ArXiv, PubMed)
as knowledge sources.

Flow:
  query → embed → similarity search in ChromaDB → top-k chunks returned
  chunks → injected into agent prompts as grounded context + citations

The embedding model runs locally on CPU/GPU (RTX 2050 compatible).
ChromaDB persists to disk at backend/chroma_store/ so it survives restarts.
"""
import os
import asyncio
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "chroma_store")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"   # 90MB, runs on RTX 2050 easily
TOP_K_RESULTS   = 6                     # retrieve top 6 chunks per query


@dataclass
class RetrievedChunk:
    """A single retrieved document chunk with full provenance metadata."""
    text: str
    source_name: str      # e.g. "Wikipedia: Artificial Intelligence"
    source_url: str       # Direct URL to the source
    source_type: str      # "wikipedia" | "arxiv" | "pubmed" | "upload"
    relevance_score: float  # cosine similarity (0-1, higher = more relevant)
    chunk_id: str


class RAGPipeline:
    """
    The core RAG engine. Singleton — initialized once at server startup.

    Usage:
        rag = RAGPipeline()
        await rag.initialize()

        # Retrieve grounded context for a query
        chunks = await rag.retrieve(query="geopolitical risks 2025", domain="general")

        # Format for injection into agent prompts
        context_block, citations = rag.format_context(chunks)
    """

    def __init__(self):
        self._client = None
        self._collection = None
        self._embedder = None
        self._ready = False

    async def initialize(self) -> bool:
        """
        Load the embedding model and connect to ChromaDB.
        Runs in a thread pool so it doesn't block the FastAPI event loop.
        """
        try:
            await asyncio.get_event_loop().run_in_executor(None, self._sync_init)
            self._ready = True
            logger.info(f"[RAG] Pipeline ready. Embedding model: {EMBEDDING_MODEL}")
            return True
        except Exception as e:
            logger.error(f"[RAG] Initialization failed: {e}")
            self._ready = False
            return False

    def _sync_init(self):
        """Synchronous init — called from thread pool.
        Tries sentence-transformers first. If HuggingFace is unreachable,
        falls back to a local TF-IDF based embedder that works fully offline.
        """
        import chromadb

        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

        # Persistent ChromaDB client — survives server restarts
        self._client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

        # Get or create the main knowledge collection
        self._collection = self._client.get_or_create_collection(
            name="neuronex_knowledge",
            metadata={"hnsw:space": "cosine"}
        )

        # Try to load sentence-transformers (needs HuggingFace download on first run)
        # Falls back to local TF-IDF embedder if network is unavailable
        try:
            from sentence_transformers import SentenceTransformer
            # Set offline mode env var to use cached model if available
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "0")
            self._embedder = SentenceTransformer(EMBEDDING_MODEL)
            self._embed_mode = "sentence_transformers"
            logger.info(f"[RAG] Loaded sentence-transformers: {EMBEDDING_MODEL}")
        except Exception as e:
            logger.warning(f"[RAG] sentence-transformers unavailable ({e}) — using TF-IDF fallback")
            self._embedder = None
            self._embed_mode = "tfidf"
            self._init_tfidf_fallback()

        logger.info(f"[RAG] ChromaDB ready. {self._collection.count()} documents indexed. Mode: {self._embed_mode}")

    def _init_tfidf_fallback(self):
        """
        Initialize a local TF-IDF based embedder.
        Produces 512-dim sparse vectors — no internet required.
        Not as accurate as sentence-transformers but works fully offline.
        """
        from sklearn.feature_extraction.text import TfidfVectorizer
        import numpy as np
        self._tfidf = TfidfVectorizer(max_features=512, stop_words='english')
        self._tfidf_corpus = []   # Grows as documents are indexed
        self._tfidf_fitted = False
        logger.info("[RAG] TF-IDF fallback embedder initialized (offline mode)")

    def _embed(self, texts: List[str]) -> List[List[float]]:
        """Convert text to embedding vectors synchronously.
        Uses sentence-transformers if available, TF-IDF otherwise.
        """
        if self._embed_mode == "sentence_transformers" and self._embedder is not None:
            embeddings = self._embedder.encode(texts, convert_to_numpy=True, show_progress_bar=False)
            return embeddings.tolist()
        else:
            # TF-IDF fallback — works fully offline
            return self._tfidf_embed(texts)

    def _tfidf_embed(self, texts: List[str]) -> List[List[float]]:
        """TF-IDF based embedding — offline fallback."""
        import numpy as np
        # Add new texts to the corpus
        new_texts = [t for t in texts if t not in self._tfidf_corpus]
        if new_texts:
            self._tfidf_corpus.extend(new_texts)

        if not self._tfidf_fitted and len(self._tfidf_corpus) >= 2:
            self._tfidf.fit(self._tfidf_corpus)
            self._tfidf_fitted = True
        elif not self._tfidf_fitted:
            # Not enough corpus yet — return uniform vectors
            return [[0.0] * 512 for _ in texts]

        vecs = self._tfidf.transform(texts).toarray()
        # Normalize to unit vectors for cosine similarity
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return (vecs / norms).tolist()

    async def retrieve(
        self,
        query: str,
        domain: str = "general",
        top_k: int = TOP_K_RESULTS,
        fetch_live: bool = True,
    ) -> List[RetrievedChunk]:
        """
        Main retrieval method.
        1. Embed the query
        2. Search ChromaDB for similar chunks
        3. If ChromaDB has < 3 results, fetch live from Wikipedia/ArXiv and index them
        4. Return ranked chunks
        """
        if not self._ready:
            logger.warning("[RAG] Pipeline not ready — skipping retrieval")
            return []

        # Step 1: Check what we already have indexed
        existing = await asyncio.get_event_loop().run_in_executor(
            None, self._sync_search, query, top_k
        )

        # Step 2: Fetch live knowledge and index it (force if fetch_live is true)
        if fetch_live or len(existing) < 3:
            logger.info(f"[RAG] Only {len(existing)} results in DB — fetching live knowledge")
            await self._fetch_and_index(query, domain)

            # Re-search after indexing
            existing = await asyncio.get_event_loop().run_in_executor(
                None, self._sync_search, query, top_k
            )

        return existing

    def _sync_search(self, query: str, top_k: int) -> List[RetrievedChunk]:
        """Synchronous similarity search in ChromaDB."""
        if self._collection.count() == 0:
            return []

        query_embedding = self._embed([query])[0]

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self._collection.count()),
            include=["documents", "metadatas", "distances"]
        )

        chunks = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i]
                distance = results["distances"][0][i]
                # ChromaDB cosine distance: 0 = identical, 2 = opposite
                # Convert to similarity score: 1 - (distance/2)
                relevance = round(1.0 - (distance / 2.0), 4)

                if relevance > 0.2:   # Only include meaningfully relevant chunks
                    chunks.append(RetrievedChunk(
                        text=doc,
                        source_name=meta.get("source_name", "Unknown"),
                        source_url=meta.get("source_url", ""),
                        source_type=meta.get("source_type", "unknown"),
                        relevance_score=relevance,
                        chunk_id=meta.get("chunk_id", ""),
                    ))

        # Sort by relevance descending
        chunks.sort(key=lambda x: x.relevance_score, reverse=True)
        return chunks

    def clear_cache(self):
        """Clears the ChromaDB collection completely."""
        try:
            # Recreate the collection to clear it completely
            if self._chroma_client:
                self._chroma_client.delete_collection("neuronex_kb")
                self._collection = self._chroma_client.create_collection("neuronex_kb")
                self._tfidf_corpus = []
                self._tfidf_fitted = False
                logger.info("[RAG] Cache cleared successfully")
        except Exception as e:
            logger.warning(f"[RAG] Failed to clear cache: {e}")

    async def _fetch_and_index(self, query: str, domain: str):
        """Fetch live documents from Wikipedia/ArXiv and index into ChromaDB."""
        from app.inference.knowledge_sources import KnowledgeFetcher
        fetcher = KnowledgeFetcher()

        docs = await fetcher.fetch(query=query, domain=domain)
        if docs:
            await asyncio.get_event_loop().run_in_executor(
                None, self._sync_index, docs
            )

    def _sync_index(self, docs: List[Dict[str, Any]]):
        """Chunk documents and add to ChromaDB."""
        texts, ids, metadatas = [], [], []

        for doc in docs:
            chunks = self._chunk_text(doc["text"], chunk_size=500, overlap=50)
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(f"{doc['url']}-{i}".encode()).hexdigest()

                # Skip if already indexed
                existing = self._collection.get(ids=[chunk_id])
                if existing["ids"]:
                    continue

                texts.append(chunk)
                ids.append(chunk_id)
                metadatas.append({
                    "source_name": doc["title"],
                    "source_url": doc["url"],
                    "source_type": doc["source_type"],
                    "chunk_id": chunk_id,
                })

        if texts:
            embeddings = self._embed(texts)
            self._collection.add(
                documents=texts,
                embeddings=embeddings,
                ids=ids,
                metadatas=metadatas,
            )
            logger.info(f"[RAG] Indexed {len(texts)} new chunks into ChromaDB")

    def index_uploaded_document(self, text: str, filename: str, context_id: str):
        """
        Index a user-uploaded document (PDF/DOCX) into ChromaDB.
        Called from the /upload endpoint so RAG can retrieve from it.
        """
        if not self._ready:
            return

        chunks = self._chunk_text(text, chunk_size=500, overlap=50)
        texts, ids, metadatas = [], [], []

        for i, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(f"{context_id}-{i}".encode()).hexdigest()
            texts.append(chunk)
            ids.append(chunk_id)
            metadatas.append({
                "source_name": f"Uploaded: {filename}",
                "source_url": f"local://{filename}",
                "source_type": "upload",
                "chunk_id": chunk_id,
            })

        if texts:
            embeddings = self._embed(texts)
            self._collection.add(
                documents=texts,
                embeddings=embeddings,
                ids=ids,
                metadatas=metadatas,
            )
            logger.info(f"[RAG] Indexed uploaded document '{filename}' ({len(texts)} chunks)")

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Split text into overlapping chunks.
        Overlap ensures context is not lost at chunk boundaries
        (the main weakness of traditional RAG).
        """
        words = text.split()
        chunks = []
        step = chunk_size - overlap

        for i in range(0, len(words), step):
            chunk = " ".join(words[i:i + chunk_size])
            if len(chunk.strip()) > 50:   # Skip tiny chunks
                chunks.append(chunk)

        return chunks

    @staticmethod
    def format_context(chunks: List[RetrievedChunk]) -> Tuple[str, List[Dict]]:
        """
        Format retrieved chunks into:
        1. A context block injected into agent prompts (full text, structured)
        2. A citations list for the UI (with snippets for display)
        """
        if not chunks:
            return "", []

        lines = [
            "=== VERIFIED KNOWLEDGE BASE (Fetched live, embedded via sentence-transformers all-MiniLM-L6-v2, stored in ChromaDB) ===",
            "CRITICAL INSTRUCTION: Every factual claim you make MUST cite its source using this exact format:",
            '  [Source: <source_name>, <source_url>]',
            "Only state facts that appear in the sources below. Do not hallucinate.",
            ""
        ]

        citations = []
        for i, chunk in enumerate(chunks, 1):
            snippet = " ".join(chunk.text.split()[:40])  # first 40 words for UI display
            lines.append(f"[Source {i}] {chunk.source_name}")
            lines.append(f"  URL: {chunk.source_url}")
            lines.append(f"  Relevance Score: {chunk.relevance_score:.3f} (cosine similarity)")
            lines.append(f"  Content: {chunk.text}")
            lines.append("")
            citations.append({
                "index": i,
                "source_name": chunk.source_name,
                "source_url": chunk.source_url,
                "source_type": chunk.source_type,
                "relevance_score": chunk.relevance_score,
                "snippet": snippet + "…",
            })

        lines.append("=== END VERIFIED SOURCES ===")
        lines.append("")
        lines.append("Now write your analysis. After EVERY sentence that contains a fact, add:")
        lines.append('  [Source: <source_name>, <source_url>]')
        lines.append("If a fact is supported by multiple sources, list all of them.")

        return "\n".join(lines), citations


# ─────────────────────────────────────────────────────────────────────────────
# Global singleton — initialized once at server startup
# ─────────────────────────────────────────────────────────────────────────────
_rag_pipeline: Optional[RAGPipeline] = None


def get_rag_pipeline() -> RAGPipeline:
    """Get the global RAG pipeline singleton."""
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline
