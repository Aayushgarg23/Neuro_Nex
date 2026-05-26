# NeuroNex: Cognitive-Engineered Multi-Agent Platform

![NeuroNex](https://img.shields.io/badge/Status-Production_Ready-emerald?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini_3.5_Flash-orange?style=for-the-badge&logo=google)

NeuroNex is a research-grade intelligence platform that abandons the traditional "single chatbot" paradigm. Instead, it utilizes a **Multi-Agent Council** (4 specialized AI agents) that debate, critique, and synthesize information to produce high-confidence, hallucination-resistant research reports. 

## 🚀 Key Features

*   **Multi-Agent Orchestration:** 4 distinct agents (Evidence, Skeptic, Connector, Methodology) run in parallel to analyze queries from completely different perspectives.
*   **Dynamic Cascade LLM Engine:** A highly resilient backend that gracefully handles API spikes by instantly cascading through models (Gemini 3.5 Flash → 3.1 Flash-Lite → 2.5 Flash).
*   **QAOA-Inspired Task Scheduling:** An internal quantum-inspired algorithm schedules agents based on priority and conflict scores to minimize API bottlenecks.
*   **Auto-Tuned Confidence Calibration:** Calculates a final consensus score using dynamically weighted parameters (α, β, γ) based on the query type.
*   **Immutable Provenance (IBCT):** Cryptographic SHA-256 hash chaining ensures every step of the agent's thought process is verifiable and tamper-proof.
*   **Document Intelligence (Local RAG):** Upload PDFs, DOCX, CSV, or TXT files. The system instantly extracts text and appends it to the agents' context window for grounded analysis.

## 🏗️ Architecture

NeuroNex follows a decoupled, asynchronous microservices architecture:

1.  **Frontend (React + Vite + Tailwind CSS):** A glassmorphic, highly responsive UI featuring Server-Sent Events (SSE) streaming, local storage session management, and real-time metric visualization.
2.  **Backend (Python + FastAPI):** High-performance async server. 
    *   **LLM Provider:** Uses `httpx` for direct, non-blocking REST calls to Google's Generative AI endpoints.
    *   **Document Parser:** Uses `pdfplumber` and `python-docx` for robust local file parsing.
3.  **Data Flow:** User Query → QAOA Scheduler → Parallel Agent Execution → Chairman Synthesis → UI Stream.

## 🛠️ Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   Google Gemini API Key

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt

# Create a .env file and add your API key
echo "GEMINI_API_KEY=your_api_key_here" > .env
echo "LLM_PROVIDER=gemini" >> .env
echo "GEMINI_MODEL=gemini-3.5-flash" >> .env

# Run the server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

## 🧬 Why NeuroNex? (Unique Value Proposition)

Single LLMs suffer from sycophancy (agreeing with the user), hallucination, and single-track thinking. NeuroNex forces a structural debate. The Skeptic Agent actively tries to destroy the Evidence Agent's argument. The Chairman is forced to synthesize these conflicting views into a calibrated confidence score. 

This makes NeuroNex viable for commercial, enterprise, and high-stakes research environments where certainty matters more than speed.
