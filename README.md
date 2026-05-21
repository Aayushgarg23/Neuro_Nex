# NeuroNex Platform v2.0
### Cognitive-Engineered Multi-Agent GraphRAG System

> A dual-process AI research platform that mimics biological cognition — separating fast heuristic lookups (System 1) from deliberate multi-agent verification over structured knowledge graphs (System 2).

---

## Architecture Overview

```
                              NEURONEX PLATFORM
                                     │
              ┌──────────────────────┴──────────────────────┐
              ▼                                             ▼
  System 1 (Fast Path)                        System 2 (Deliberative)
  ─────────────────────                       ─────────────────────────
  • Sub-50ms vector routing                   • Multi-Agent Verification (MAV)
  • Semantic similarity fallback              • Tree of Thoughts (ToT) search
  • Redis cache layer                         • Neo4j GraphRAG + Writeback
                                              • QAOA Task Scheduling
                                              • IBCT Provenance Chain
                                              • AMRO Speculative Routing
                                              • QISA Attention Layer
```

### Agent Council (System 2 MAV)

| Agent | Role | Color |
|---|---|---|
| 🔬 Evidence Agent | Gathers factual experimental evidence | Emerald |
| ⚔️ Skeptic Agent | Audits methodological bias & sample size | Red |
| 🔗 Connector Agent | Multi-hop graph traversal (depth=4) | Blue |
| 📋 Methodology Agent | Clinical translation risk & TRL assessment | Purple |

**Consensus Formula:**
```
Score = α·E + β·C − γ·S·(1 − Q)
  α=0.6 (evidence weight), β=0.4 (connector weight), γ=0.2 (skeptic penalty)
```

---

## Project Structure

```
neuronex-platform/
├── docker-compose.yml              # Postgres/pgvector + Neo4j + Redis
├── .env                            # Root environment config
├── sql/init.sql                    # pgvector extension + schema init
│
├── backend/                        # FastAPI Cognitive Core
│   ├── main.py                     # API entrypoint + /health, /graph, /metrics
│   ├── requirements.txt
│   ├── .env                        # Backend environment
│   └── app/
│       ├── agents/
│       │   ├── orchestrator.py     # LangGraph StateGraph (parallel fan-out)
│       │   └── council.py          # Agent configs + peer-review matrix
│       ├── inference/
│       │   ├── llm_provider.py     # LLMProvider interface + MockLLMAdapter
│       │   ├── ibct_chain.py       # SHA-256 hash-chain provenance
│       │   ├── token_budget.py     # Per-session token tracking + tier switching
│       │   └── amro_router.py      # Ant-Colony pheromone routing
│       ├── quantum/
│       │   ├── qisa_attention.py   # Quantum-Inspired Self-Attention (Hilbert space)
│       │   └── qaoa_scheduler.py   # QAOA-inspired agent task scheduler
│       └── db/
│           ├── postgres.py         # Async psycopg pool + pgvector search
│           └── neo4j_conn.py       # GraphRepository pattern (JSON stub → Neo4j)
│
├── frontend/                       # Vite + React 18 Dashboard
│   ├── vite.config.js              # Proxy /api → FastAPI
│   ├── index.html                  # Google Fonts + SEO meta
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                 # 3-column investor dashboard
│       ├── index.css               # Premium dark theme + glassmorphism
│       └── components/
│           ├── VisualGraph.jsx     # Interactive Neo4j graph (vis-network)
│           ├── StreamPanel.jsx     # Live agent deliberation stream
│           ├── ConsensusGauge.jsx  # SVG arc gauge
│           ├── IBCTChain.jsx       # Blockchain provenance visualizer
│           ├── AMROHeatmap.jsx     # 5×5 pheromone routing matrix
│           ├── SystemRouter.jsx    # System 1/2 cognitive router indicator
│           └── MetricCard.jsx      # Animated metric counter card
│
└── gateway/                        # BFF Gateway (Express)
    └── src/
        ├── index.js               # Proxy + auth + rate limiting
        └── auth/middleware.js     # JWT / API key auth + rate limiter
```

---

## Quick Start

### Prerequisites
- Docker Desktop (for Postgres, Neo4j, Redis)
- Node.js 18+ and npm
- Python 3.11+

### Step 1 — Start Infrastructure

```bash
# From neuronex-platform/ root
docker compose up -d

# Verify all 3 services are healthy
docker compose ps
```

Expected output: `neuronex-postgres`, `neuronex-neo4j`, `neuronex-redis` all `healthy`.

---

### Step 2 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux/Mac)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python main.py
```

Backend available at: **http://localhost:8000**
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

---

### Step 3 — Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend available at: **http://localhost:5173**

---

### Step 4 — Gateway Setup (Optional)

```bash
cd gateway

npm install
npm start
```

Gateway available at: **http://localhost:3001**

---

## API Reference

### POST `/api/v1/research`
Execute the full System 2 multi-agent deliberation pipeline.

```bash
curl -X POST http://localhost:8000/api/v1/research \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Is Compound_A efficient at activating Pathway_Y via Receptor_Z?",
    "thread_id": "clinical_trial_00889"
  }'
```

**Response:**
```json
{
  "thread_id": "clinical_trial_00889",
  "status": "success",
  "score": 0.742,
  "data": {
    "consensus_verdict": "MODERATE CONFIDENCE: Plausible mechanism...",
    "confidence_score": 0.742,
    "trl_assessment": "TRL-3 (Experimental proof-of-concept)",
    "citations_found": ["Paper-992", "Paper-104"]
  },
  "peer_evaluations_compiled": { ... },
  "ibct_chain": [ ... ],
  "amro_log": [ ... ],
  "qaoa_schedule": [ ... ],
  "token_budget": { ... }
}
```

### GET `/api/v1/graph`
Returns the full knowledge graph for visualization.

### GET `/api/v1/metrics`
Platform-wide performance metrics.

### GET `/health`
System health check.

---

## Configuration

### Environment Variables (`.env`)

```bash
# Backend (backend/.env)
DATABASE_URL=postgresql://postgres:postgres_pass@localhost:5432/neuronex_db

# LLM Provider — change from 'mock' to 'gemini' when ready
LLM_PROVIDER=mock

# Graph Repository — change from 'memory' to 'neo4j' when ready
GRAPH_REPO=memory

# Neo4j (when GRAPH_REPO=neo4j)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=SecurePassword123
```

---

## Production Transition Guide

### 1. LLM: Mock → Gemini

Edit `backend/app/inference/llm_provider.py`, change one line in `get_llm_provider()`:
```python
# Change this:
LLM_PROVIDER=mock  # in .env

# To this:
LLM_PROVIDER=gemini  # + set GEMINI_API_KEY in .env
# Then uncomment GeminiAdapter class in llm_provider.py
```

**Zero changes to agent logic required.**

### 2. Graph: JSON Stub → Live Neo4j

Edit `backend/app/db/neo4j_conn.py`, change one line in `get_graph_repository()`:
```python
# Change this:
GRAPH_REPO=memory  # in .env

# To this:
GRAPH_REPO=neo4j  # + set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env
# Then uncomment Neo4jGraphRepository class in neo4j_conn.py
```

**Zero changes to orchestrator logic required.**

### 3. IBCT: SHA-256 → HMAC/Biscuit

In `backend/app/inference/ibct_chain.py`, replace `_compute_hash()`:
```python
# Replace:
hashlib.sha256(raw.encode()).hexdigest()

# With HMAC:
import hmac
hmac.new(SECRET_KEY, raw.encode(), hashlib.sha256).hexdigest()
```

**No changes to chain append/verify logic required.**

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **API** | FastAPI + Uvicorn | Async cognitive core |
| **Orchestration** | LangGraph 1.2+ | StateGraph with parallel fan-out |
| **State Persistence** | PostgreSQL + psycopg3 | LangGraph checkpoint storage |
| **Vector Search** | pgvector | Semantic similarity fallback |
| **Knowledge Graph** | Neo4j 5 (stubbed) | GraphRAG entity relationships |
| **Cache** | Redis 7 | System 1 fast path cache |
| **Gateway** | Express + http-proxy | BFF with auth + rate limiting |
| **Frontend** | React 18 + Vite | Interactive research dashboard |
| **Graph UI** | vis-network | Interactive knowledge graph |
| **Styling** | Tailwind CSS 3 | Glassmorphism dark theme |
| **Quantum** | NumPy (QISA/QAOA) | Classical quantum simulation |

---

## Verification

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Full pipeline test
curl -X POST http://localhost:8000/api/v1/research \
  -H "Content-Type: application/json" \
  -d '{"query": "Is Compound_A efficient at activating Pathway_Y via Receptor_Z?", "thread_id": "test_001"}'

# 3. Graph data
curl http://localhost:8000/api/v1/graph

# 4. Platform metrics
curl http://localhost:8000/api/v1/metrics
```

---

*NeuroNex Platform v2.0 — Cognitive-Engineered Multi-Agent GraphRAG*
*Interface-First Architecture · MockLLM → Production-Ready · SHA-256 IBCT Provenance*
