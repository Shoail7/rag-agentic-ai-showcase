# AI Learning Lab — RAG, AI Agents, Agentic RAG & Rate Checker

[![GitHub Repository](https://img.shields.io/badge/GitHub-rag--agentic--ai--showcase-181717?style=flat&logo=github)](https://github.com/Shoail7/rag-agentic-ai-showcase)
[![Python FastAPI](https://img.shields.io/badge/Backend-FastAPI%203.10+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React Vite](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat&logo=react)](https://react.dev)
[![Vector Search](https://img.shields.io/badge/Vector%20DB-FAISS%20IndexFlatIP-blue?style=flat)](https://github.com/facebookresearch/faiss)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An educational, interactive web application running locally on your machine that demonstrates the practical differences between:

1. **Conventional RAG (Retrieval-Augmented Generation)**: Single-pass semantic search using local **FAISS** vector indexes with token-bounded prompt augmentation.
2. **Autonomous AI Agents**: Multi-step **ReAct** (`THINK → ACT → OBSERVE → FINAL ANSWER`) reasoning loops with deterministic local & free REST tools (including live weather via Open-Meteo).
3. **Agentic RAG**: Complex question decomposition, parallel retrieval across multiple editions, evidence evaluation, and multi-source synthesis.
4. **Rate Checker & Quota Telemetry**: Live multi-currency exchange rates powered by Open Exchange Rates API alongside LLM model quota telemetry (TPM, RPM, RPD, and countdown clocks).
5. **Local FAISS Vector Engine**: Persistent 384-dimensional dense embeddings (`BAAI/bge-small-en-v1.5`) with exact inner-product (cosine) retrieval running 100% on local CPU.

---

## ⚡ Quick Start (Double-Click Local Windows Execution)

You can launch and run the entire application using a single command or double-clicking one file.

### First-Time Prerequisites
1. **Python 3.10+**: Ensure Python is installed and added to your system `PATH`.
2. **Node.js (v18+) & npm**: Ensure Node.js LTS is installed.

### Normal Launch (Double-Click)
1. In the project root directory, double-click:
   ```cmd
   start.bat
   ```
2. The script will automatically:
   - Detect project root and verify Python, Node.js, and npm.
   - Automatically create the Python virtual environment (`backend\venv\`) if not already present.
   - Install required backend and frontend dependencies without reinstalling unnecessarily.
   - Create local configuration files (`.env` and `frontend\.env`).
   - Launch the FastAPI backend on `http://localhost:8000` in its own visible window.
   - Launch the React/Vite frontend on `http://localhost:5173` in its own visible window.
   - Poll `http://127.0.0.1:8000/api/health` until the backend is confirmed healthy.
   - Automatically open `http://localhost:5173` in your default browser.

### Single-Command Shutdown
To safely stop all services without affecting any unrelated applications on your PC:
- **Option 1**: Type `s` and press **Enter** in the `start.bat` launcher window.
- **Option 2**: Double-click:
  ```cmd
  stop.bat
  ```
  `stop.bat` reads the tracked process IDs (`.pids.json`), cleanly terminates both backend and frontend processes, frees ports `8000` and `5173`, and cleans up all temporary process-tracking files.

### Optional PowerShell Alternative
If you prefer PowerShell, you can run:
```powershell
.\start.ps1
```

---

## 🌐 Local Application URLs

| Service | Local URL | Description |
|---|---|---|
| **Frontend Web Interface** | `http://localhost:5173` | React 19 + Tailwind CSS Liquid Aurora Glassmorphism UI |
| **Backend API** | `http://localhost:8000` | Python FastAPI application server |
| **Interactive API Documentation** | `http://localhost:8000/docs` | Swagger UI for interactive endpoint exploration |
| **Backend Health Check** | `http://localhost:8000/api/health` | System health check (Database, FAISS, Storage) |

---

## 🌟 Application Modules & Features

### 1. Shared PDF Document Library (`/pdf-library`)
- Drag-and-drop PDF uploads with SHA-256 deduplication and SQLite metadata indexing.
- Page-by-page text extraction with PyMuPDF preserving exact page coordinates.
- **One-Click Preloaded Handbooks**: Click **"Load Sample Handbooks"** in the top header to instantly index the included fictional `Nexora_Employee_Handbook_2024.pdf` and `Nexora_Employee_Handbook_2025.pdf`.
- Deleting a document automatically cleans up associated FAISS binary vector indexes.

### 2. RAG Explorer (`/rag-explorer`)
- Step-by-step visual inspection of the 8-stage conventional RAG pipeline:
  `PDF Input → Text Extraction → Token Chunking → Embedding → FAISS Vector Store → Similarity Retrieval → Prompt Augmentation → Grounded LLM Generation`
- Every stage contains educational explanations, parameters, and interactive inspection data so no stage card is ever empty.

### 3. AI Agent Studio (`/agent-studio`)
- Observable multi-step ReAct agent reasoning timeline showing `Thought → Action → Observation → Final Answer`.
- **6 Deterministic Educational Tools**:
  1. **Arithmetic Safe Calculator**: Evaluates arithmetic expressions, percentages, and formulas without unrestricted execution risks.
  2. **Date & Deadline Calculator**: Calendar arithmetic, offsets, and working-day deadlines.
  3. **Open-Meteo Live Weather Tool**: Real-time global weather forecast querying `geocoding-api.open-meteo.com` and `api.open-meteo.com` (temperature, feels like, humidity, wind, precipitation, and conditions with no API key needed).
  4. **Mock Travel Search**: Simulated transport pricing, hotel options, and daily meal budgets.
  5. **CSV Dataset Analyzer**: Computes column sums, averages, row counts, and min/max boundaries on tabular records.
  6. **Text & Key Phrase Extractor**: Sentence counts, word statistics, and bulleted highlights.

### 4. Agentic RAG Studio (`/agentic-rag-studio`)
- Autonomous multi-document retrieval orchestration.
- Decomposes multi-part queries (such as policy evolution across 2024 vs 2025 handbooks) into focused sub-queries.
- Evaluates evidence sufficiency and performs automated query rewriting and bounded retries.
- Constructs multi-column comparative synthesis matrices with verifiable citations.

### 5. Rate Checker & Quota Telemetry (`/rate-checker`)
- **Tab 1: Live Currency Exchange Rates**:
  - Live currency conversion across 16+ global currencies (USD, EUR, GBP, INR, JPY, CAD, AUD, CHF, etc.).
  - Real-time exchange rate calculation via free Open Exchange Rates API.
  - Interactive Base and Target currency dropdowns, amount presets ($10, $50, $100, $500, $1,000), and 1-click **Swap Currencies** button.
  - Popular Forex benchmark grid (EUR/USD, USD/INR, GBP/USD, USD/JPY, etc.).
  - Resilient local benchmark fallback so the page is **never blank**.
- **Tab 2: LLM Model Quotas & Resets**:
  - Real-time countdown clocks: Rolling 60-second sliding window, Groq daily reset (00:00 UTC), and Gemini daily reset (00:00 PT).
  - Quota telemetry cards for Gemini 2.5 Flash, Gemini 2Pro, Groq Llama 3.3 70B, Llama 3.1 8B, and Ollama.
  - Interactive Token Budget Estimator calculating prompt token footprint and % of TPM limit consumed.

### 6. Learning Centre (`/learning-centre`)
- Illustrated guides explaining tokenization, embedding geometry, cosine distance, vector search, ReAct loops, and agentic query decomposition.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, React Router v7 |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2, PyMuPDF (fitz), pypdf |
| **Vector Engine** | **FAISS (`faiss-cpu`)** using `IndexFlatIP` (Exact Inner Product on L2-normalized 384d vectors) |
| **Local Embeddings** | `BAAI/bge-small-en-v1.5` (384 dimensions, local CPU execution via HuggingFace `AutoTokenizer` and PyTorch) |
| **LLM Support** | Google Gemini Developer API (Flash free-tier), Groq Cloud API, Ollama Local Models |
| **Database** | SQLite with Write-Ahead Logging (WAL) in `backend/storage/learning_lab.db` |
| **Process Control** | Windows Batch (`start.bat`, `stop.bat`) and PowerShell (`start.ps1`) |

---

## 📁 Project Directory Structure

```text
rag-agentic-ai-showcase/
├── start.bat                 # One-click Windows startup script (starts both frontend & backend)
├── stop.bat                  # One-click Windows shutdown script (stops only this project's processes)
├── start.ps1                 # PowerShell alternative startup script
├── .env.example              # Master environment template (local execution)
├── sample_documents/         # Nexora Employee Handbooks (2024 & 2025)
│   ├── Nexora_Employee_Handbook_2024.pdf
│   └── Nexora_Employee_Handbook_2025.pdf
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # App configuration & local paths
│   │   │   └── database.py       # SQLite WAL database & schema initialization
│   │   ├── routers/
│   │   │   ├── agent.py          # AI Agent execution & individual tool sandbox
│   │   │   ├── agentic_rag.py    # Multi-document Agentic RAG endpoints
│   │   │   ├── chunk_lab.py      # Chunking experimentation endpoints
│   │   │   ├── documents.py      # PDF upload, preview, and library endpoints
│   │   │   ├── rag.py            # Conventional RAG pipeline endpoints
│   │   │   ├── rates_router.py   # Live currency rates & conversion endpoints
│   │   │   └── settings_router.py# LLM settings, rate limits & health telemetry
│   │   ├── services/
│   │   │   ├── agent_service.py      # ReAct loop orchestrator & tool executors
│   │   │   ├── agentic_rag_service.py# Multi-hop query planner & synthesizer
│   │   │   ├── embedding_service.py  # FAISS vector indexing & query embeddings
│   │   │   ├── llm_service.py        # Provider abstraction (Gemini / Groq / Ollama)
│   │   │   ├── pdf_service.py        # PyMuPDF text & page rasterizer
│   │   │   └── rag_service.py        # End-to-end RAG pipeline
│   │   └── main.py               # FastAPI entrypoint, lifespan, CORS & routers
│   ├── storage/                  # Persistent local disk storage (gitignored)
│   │   ├── uploads/              # Local uploaded PDF binary files
│   │   └── faiss_index/          # Serialized .faiss binary index files
│   ├── tests/                    # Automated pytest test suites
│   └── requirements.txt          # Backend Python requirements
├── frontend/
│   ├── src/
│   │   ├── components/           # Header, Sidebar, Glass UI controls
│   │   ├── context/              # ThemeContext (Light/Dark mode & Mobile Drawer)
│   │   ├── pages/                # Dashboard, RAG Explorer, Studios, Rate Checker
│   │   ├── services/api.ts       # Unified API client (configured for http://localhost:8000)
│   │   └── types/index.ts        # TypeScript contracts
│   ├── package.json              # Frontend npm dependencies
│   ├── vite.config.ts            # Vite proxy & build configuration
│   └── .env.example              # Frontend local environment template
└── README.md
```

---

## 💾 Data Persistence & Local Storage

All data persists locally across restarts:
- **PDF Documents**: Stored under `backend/storage/uploads/`.
- **FAISS Vector Indexes**: Binary indices saved under `backend/storage/faiss_index/`.
- **Application Metadata**: Stored in SQLite with Write-Ahead Logging (`backend/storage/learning_lab.db`).
- Stopping and restarting the application retains all previously uploaded documents, extracted chunks, and vector embeddings.

---

## 🧪 Running Automated Tests

To run the complete backend test suite locally:
```powershell
backend\venv\Scripts\python.exe -m pytest backend/tests/test_pipeline.py -v
```

All 10 test modules pass:
- Arithmetic Safe Calculator AST verification
- Date & Deadline Calculator offset computation
- Simulated Travel Search budget matching
- Text Analysis word & key phrase extraction
- CSV Dataset Analyzer column statistics
- PDF Extraction with PyMuPDF on sample handbooks
- Token Chunking length constraints with `bge-small-en-v1.5`
- Agentic RAG multi-document question decomposition
- Live Currency Exchange Rate retrieval and conversion
- Open-Meteo Weather Tool live query and parsing

---

## 🔧 Troubleshooting

### Port 8000 or 5173 is already in use
Run `stop.bat` to automatically detect and release any processes holding ports 8000 or 5173.

### Python command not recognized
Ensure Python 3.10+ is installed and that the option **"Add python.exe to PATH"** was selected during installation. Test with `python --version` in a command prompt.

### Node.js or npm not recognized
Download and install the LTS version of Node.js from [nodejs.org](https://nodejs.org/). Open a new command prompt and verify with `node -v` and `npm -v`.

### Resetting sample data
To reset the document library, open the **PDF Library** (`/pdf-library`), delete any unwanted documents, and click **"Load Sample Handbooks"** in the top header to cleanly re-index both 2024 and 2025 handbooks.
