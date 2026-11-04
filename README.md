# AI Learning Lab – RAG, AI Agents, and Agentic RAG

An interactive, educational web application designed to teach students and developers the practical, architectural, and operational differences between:

1. **RAG (Retrieval-Augmented Generation)**: Single-pass semantic retrieval and prompt augmentation.
2. **AI Agents**: Autonomous multi-step ReAct reasoning loops with external deterministic tools.
3. **Agentic RAG**: Question decomposition, multi-document synthesis, retrieval evaluation, and bounded retries.
4. **Chunk Size Comparison Laboratory**: Side-by-side benchmarking of 128 vs 256 vs 400 token chunk sizes on the same document and question.

---

## 🌟 Key Features

- **Shared PDF Document Library**: Drag-and-drop multiple PDF uploads, SHA-256 deduplication, PyMuPDF page-level extraction, visual page rasterization preview, and automatic ChromaDB vector cleanup on deletion.
- **Preloaded Fictional Handbooks**: Includes the demonstration `Nexora_Employee_Handbook_2024.pdf` and `Nexora_Employee_Handbook_2025.pdf` for instant 1-click loading and testing.
- **Conventional RAG Explorer**: Clickable 8-stage visual pipeline (`PDF → Extraction → Chunking → Embeddings → ChromaDB → Retrieval → Prompt Context → Grounded Answer`) with source citations.
- **AI Agent Studio**: Multi-step ReAct loop (`THINK → ACT → OBSERVE → FINAL ANSWER`) equipped with 5 working tools (Safe Calculator, Date Calculator, Mock Travel Search, Text Analyzer, CSV Data Analyzer) and live visual timeline.
- **Agentic RAG Studio**: Multi-document question decomposition, query rewriting, retrieval quality evaluation, and bounded retries to produce grounded comparative tables between 2024 and 2025 handbooks.
- **Chunk Size Laboratory**: Benchmarks 3 distinct chunk configurations (128 vs 256 vs 400 tokens) side-by-side with actual measured metrics, matching keyword highlights, Recharts visualizations, and CSV/JSON export.
- **Educational Learning Centre**: In-depth theoretical guides and diagrams covering chunking trade-offs, vector geometries, ReAct loops, and agentic workflows.
- **Provider Abstraction Layer**: Switch seamlessly between Google Gemini, Groq API, and Ollama local models. API keys are stored securely on the backend and are never exposed in browser responses.
- **Dark & Light Mode**: Built-in responsive SaaS-grade UI with light and dark themes.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic, PyMuPDF (fitz) |
| **Embeddings** | `BAAI/bge-small-en-v1.5` (384-dimensional, local CPU, HuggingFace AutoTokenizer) |
| **Vector Database** | ChromaDB with persistent storage |
| **LLM Providers** | Google Gemini (GenAI SDK), Groq API, Ollama Local Models |
| **Metadata Storage** | SQLite with Write-Ahead Logging (WAL) & Supabase Storage Driver |

---

## 🚀 Quick Start Guide (Local Setup)

### Prerequisites
- **Python 3.11+** installed (`python --version`)
- **Node.js v18+** installed (`node --version`)

### 1. Clone & Enter Project Directory
```bash
cd "c:\Users\Shoailuddin\Desktop\RAG Chatbot"
```

### 2. Backend Setup
```bash
# Optional: create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install Python dependencies
pip install fastapi uvicorn pydantic pydantic-settings pymupdf chromadb sentence-transformers transformers torch google-genai groq pytest httpx

# Run the FastAPI backend server
uvicorn backend.app.main:app --reload --port 8000
```
*The backend API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

### 3. Frontend Setup
Open a separate terminal window:
```bash
cd frontend

# Dependencies are already installed; to reinstall or update:
npm install

# Start Vite React development server
npm run dev
```
*The web application is accessible at [http://localhost:5173](http://localhost:5173).*

---

## 🧪 Testing & Verification

Run the automated test suite covering all 5 agent tools, token chunking, PDF extraction, and known ground-truth answers from the Nexora 2024 & 2025 handbooks:

```bash
# Run all unit and pipeline tests
python -m pytest backend/tests/test_pipeline.py

# Run ground truth evaluation benchmarks
python -m pytest backend/tests/test_evaluation_dataset.py
```

---

## 📋 Evaluation Demonstration Questions

Try these pre-configured inquiries across the learning studios:

1. **Chunk Size Laboratory**:
   - `"How many annual leaves can an employee carry forward?"`
   - *(Compares 128 vs 256 vs 400 token chunks: observe how small chunks locate the 7-day limit with high precision, while medium chunks retain the surrounding expiration rules).*

2. **Agentic RAG Studio**:
   - `"Compare the annual leave policies in the 2024 and 2025 employee handbooks. Explain every change and identify which year provides better benefits."`
   - `"Compare overtime, work-from-home, medical insurance and learning budgets between 2024 and 2025."`
   - *(Watch the agent decompose into sub-queries for 2024 and 2025 handbooks, evaluate retrieval sufficiency, and generate a markdown comparison table).*

3. **AI Agent Studio**:
   - `"Plan a two-day Goa trip under ₹10,000."`
   - *(Follows the ReAct sequence: checks transport options, hotel costs, food allowances, invokes Calculator, verifies total does not exceed ₹10,000, and returns an itemized budget).*

4. **Conventional RAG Explorer**:
   - `"What is the standard employee probation period in the 2025 handbook?"`
   - *(Click through all 8 stages of the visual pipeline and inspect the retrieved chunk embeddings and prompt context).*

---

## 🔒 Security Best Practices

- **Zero Client-Side Keys**: API keys for Gemini or Groq are configured exclusively on the backend or in `.env`.
- **Masked Previews**: Frontend endpoints only receive masked indicators (e.g., `AIzaSy••••••••Ab12`).
- **Sandboxed Agent Tools**: The AI Agent executes only predefined, validated tools (Safe AST Calculator, Date Math, Mock Travel, CSV Stats). No arbitrary Python or shell commands are permitted.
- **Path Traversal Protection**: Uploaded file names are sanitized to prevent directory traversal attacks.

---

## 🌐 Production Deployment

- **Frontend**: Deploy static build (`npm run build`) to Vercel, Netlify, or Cloudflare Pages.
- **Backend**: Deploy FastAPI app to Render, Railway, or Fly.io with Docker or standard Python buildpacks.
- **Storage**: Set `STORAGE_TYPE=supabase` in production `.env` with your `SUPABASE_URL` and `SUPABASE_KEY` for persistent cloud file and vector synchronization.

