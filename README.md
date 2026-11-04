# RAG & Agentic AI Showcase (AI Learning Lab)

[![GitHub Repository](https://img.shields.io/badge/GitHub-rag--agentic--ai--showcase-181717?style=flat&logo=github)](https://github.com/Shoail7/rag-agentic-ai-showcase)
[![Python FastAPI](https://img.shields.io/badge/Backend-FastAPI%203.11+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React Vite](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat&logo=react)](https://react.dev)
[![Vector Search](https://img.shields.io/badge/Vector%20DB-FAISS%20%2B%20ChromaDB-blue?style=flat)](https://github.com/facebookresearch/faiss)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An educational, interactive web application designed to demonstrate and teach the architectural and operational differences between:

1. **Conventional RAG (Retrieval-Augmented Generation)**: Single-pass semantic retrieval with token-bounded prompt augmentation.
2. **Deterministic AI Agents**: Autonomous multi-step **ReAct** (`THINK → ACT → OBSERVE → FINAL ANSWER`) reasoning loops with external deterministic tools.
3. **Agentic RAG**: Complex question decomposition, query rewriting, multi-document synthesis, and retrieval verification with bounded retries.
4. **FAISS & ChromaDB Vector Search**: Real-time vector indexing, cosine similarity scoring, and persistent index management.
5. **Rate Limits & Quota Telemetry (Limit Check)**: Real-time RPM, TPM, and daily reset countdowns (Rolling 60s, UTC Midnight, PT Midnight) with an interactive prompt budget calculator.

---

## 🌟 Application Features

- **Shared PDF Document Library**: Drag-and-drop multiple PDF uploads, SHA-256 deduplication, PyMuPDF page-level extraction, visual page rasterization preview, and automatic vector index cleanup upon deletion.
- **Preloaded Fictional Demonstration Handbooks**: Includes `Nexora_Employee_Handbook_2024.pdf` and `Nexora_Employee_Handbook_2025.pdf` for instant 1-click loading and comparative testing.
- **RAG Explorer Pipeline**: Interactive 8-stage visual pipeline (`PDF → Extraction → Chunking → Embeddings → Vector Index → Retrieval → Prompt Context → Grounded Answer`) with exact page citations and source snippets.
- **AI Agent Studio**: Multi-step tool-use agent equipped with 5 deterministic tools:
  - **Calculator**: Safe AST-based mathematical calculation.
  - **Date Calculator**: Working days calculation, deadline estimation, and date delta.
  - **Mock Travel Search**: Simulated transport, accommodation, and food pricing for budget queries.
  - **Text Analyzer**: Word counting, summarization, and key phrase extraction.
  - **CSV Data Analyzer**: Tabular data parsing with statistical averages, totals, and min/max detection.
- **Agentic RAG Studio**: Decomposes complex cross-handbook questions into targeted sub-queries, executes parallel vector searches, evaluates evidence sufficiency, and constructs structured comparison tables.
- **Limit Check & Quota Monitor**: Live telemetry across Gemini (15 RPM / 1M TPM), Groq (30 RPM / 14k-30k TPM), and Ollama (unlimited local compute) with live countdown clocks and a token budget estimator.
- **Liquid Aurora Glassmorphism UI**: SaaS-grade glass design system supporting seamless light and dark mode toggling.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router v7 |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, PyMuPDF (fitz), pypdf |
| **Vector Engine** | **FAISS** (`faiss-cpu`, `IndexFlatIP` normalized cosine space) & **ChromaDB** with persistent disk storage |
| **Embeddings** | `BAAI/bge-small-en-v1.5` (384 dimensions, local CPU inference, HuggingFace AutoTokenizer / Rust `tokenizers`) |
| **LLM Providers** | Google Gemini Developer API (Flash models), Groq Cloud API, Ollama Local Models |
| **Metadata Storage** | SQLite with Write-Ahead Logging (WAL) and Supabase Storage abstraction |

---

## 📁 System Architecture

```text
rag-agentic-ai-showcase/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # System configuration & environment paths
│   │   │   └── database.py       # SQLite WAL database & schema management
│   │   ├── routers/
│   │   │   ├── agent.py          # AI Agent ReAct execution endpoints
│   │   │   ├── agentic_rag.py    # Multi-document Agentic RAG endpoints
│   │   │   ├── chunk_lab.py      # Chunking experimentation endpoints
│   │   │   ├── documents.py      # PDF upload, preview, and library endpoints
│   │   │   ├── rag.py            # Conventional RAG pipeline endpoints
│   │   │   └── settings_router.py# LLM settings, rate limits & health telemetry
│   │   ├── services/
│   │   │   ├── agent_service.py      # ReAct loop orchestrator & tool executor
│   │   │   ├── agentic_rag_service.py# Multi-hop query planner & synthesizer
│   │   │   ├── embedding_service.py  # FAISS & ChromaDB embedding pipeline
│   │   │   ├── llm_service.py        # Provider abstraction (Gemini/Groq/Ollama)
│   │   │   ├── pdf_service.py        # PyMuPDF parser & page renderer
│   │   │   ├── rag_service.py        # End-to-end RAG pipeline
│   │   │   └── storage_service.py    # Local & Supabase object storage driver
│   │   └── main.py               # FastAPI application entrypoint
│   ├── storage/                  # Local persistent runtime storage (gitignored)
│   │   ├── uploads/              # Uploaded raw PDF files
│   │   ├── faiss_index/          # Serialized .faiss binary indices & metadata
│   │   └── chroma_db/            # ChromaDB SQLite & parquet vector tables
│   ├── tests/                    # Automated test suites (20 tests)
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/           # Header, Sidebar, Glass UI controls
│   │   ├── pages/                # Dashboard, RAG Explorer, Studios, Limit Check
│   │   ├── services/api.ts       # Unified API client with VITE_API_BASE_URL
│   │   └── types/                # Strict TypeScript interface contracts
│   ├── package.json              # Frontend dependencies
│   ├── vercel.json               # SPA client-side routing rewrites
│   └── vite.config.ts            # Vite proxy & build configuration
├── sample_documents/             # Nexora Employee Handbooks (2024 & 2025)
├── render.yaml                   # Render Blueprint Infrastructure-as-Code
├── requirements.txt              # Root Python dependencies for cloud buildpacks
├── vercel.json                   # Root Vercel deployment specification
└── README.md
```

---

## 🔍 FAISS Vector Database Implementation

The application uses **FAISS (Facebook AI Similarity Search)** via `faiss-cpu`:

- **Metric**: Inner Product (`IndexFlatIP`) over L2-normalized 384-dimensional vector embeddings, mathematically equivalent to Cosine Similarity:
  $$\text{Cosine Similarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|_2 \|\vec{v}\|_2}$$
- **Persistence**:
  - Binary index: `backend/storage/faiss_index/{collection_name}.faiss`
  - Chunk metadata: `backend/storage/faiss_index/{collection_name}.json`
- **Synchronization**: Whenever a document is indexed, both the FAISS index and the ChromaDB collection are automatically synchronized.
- **Latency**: Sub-millisecond retrieval on local CPU hardware.

---

## 🚀 Local Installation & Setup

### Prerequisites

- **Python 3.11+** (`python --version`)
- **Node.js v18+** (`node --version`)
- **Git** (`git --version`)

### 1. Clone the Repository

```bash
git clone https://github.com/Shoail7/rag-agentic-ai-showcase.git
cd rag-agentic-ai-showcase
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend
uvicorn backend.app.main:app --reload --port 8000
```
API docs available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
Health diagnostic endpoint: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 3. Frontend Setup

Open a new terminal window:

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite React development server
npm run dev
```
Open your browser to: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Automated Testing

The repository contains 20 comprehensive unit, pipeline, and ground-truth evaluation tests:

```bash
# Run all pipeline and agent tool tests (8 passed)
python -m pytest backend/tests/test_pipeline.py

# Run ground-truth comparative policy benchmark tests (12 passed)
python -m pytest backend/tests/test_evaluation_dataset.py
```

---

## ☁️ Deployment Instructions

### Deploying the Backend to Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `Shoail7/rag-agentic-ai-showcase`.
4. Configure the service settings:
   - **Name**: `rag-agentic-backend`
   - **Root Directory**: `backend` (or leave empty if using root)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
5. Add Environment Variables:
   - `DEFAULT_PROVIDER`: `gemini` (or `groq`)
   - `GEMINI_API_KEY`: *(Optional free-tier key; can also be inputted dynamically in Settings)*
   - `STORAGE_TYPE`: `local`
6. Click **Deploy Web Service**.
7. Note down your Render backend URL (e.g., `https://rag-agentic-backend.onrender.com`).

*(Alternatively, use the included `render.yaml` blueprint via **New +** → **Blueprint**).*

---

### Deploying the Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/new).
2. Import the GitHub repository: `Shoail7/rag-agentic-ai-showcase`.
3. In project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-name.onrender.com` (your deployed Render URL)
5. Click **Deploy**.
6. The app will build and deploy live with client-side SPA routing powered by `vercel.json`.

---

## ⚠️ Free-Tier Ephemeral Storage Limitations

On Render's free tier, the hosting filesystem is **ephemeral**:

1. Any files uploaded to `backend/storage/uploads/` and indices stored in `backend/storage/faiss_index/` remain accessible while the service instance runs.
2. If the service restarts or spins down due to inactivity, local storage resets to the Git commit state.
3. **Built-in Resilience**:
   - The application automatically re-indexes the preloaded demonstration handbooks on cold boot.
   - For permanent enterprise storage, set `STORAGE_TYPE=supabase` in environment variables with your `SUPABASE_URL` and `SUPABASE_KEY`.

---

## 🔒 Security Best Practices

- **Zero Secrets Committed**: `.env` and runtime `.db` files are strictly excluded via `.gitignore`.
- **Backend Masking**: API keys are stored on the server and masked in all network telemetry responses.
- **Deterministic Sandboxing**: The AI Agent executes only whitelisted AST mathematical evaluations and structured tool functions.

---

## 📄 License

This project is licensed under the MIT License.
