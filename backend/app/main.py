import os
import sys
from pathlib import Path

# Ensure both workspace root and backend directory are in sys.path
_current_file = Path(__file__).resolve()
_backend_dir = _current_file.parent.parent
_workspace_root = _backend_dir.parent
for p in [str(_workspace_root), str(_backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings, SAMPLE_DOCS_DIR
from backend.app.core.database import init_db, get_db
from backend.app.routers import (
    documents,
    rag,
    agent,
    agentic_rag,
    chunk_lab,
    settings_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    init_db()
    
    # Auto-load sample Nexora documents on first launch if storage is empty
    try:
        with get_db() as db:
            count = db.execute("SELECT COUNT(*) as cnt FROM documents").fetchone()["cnt"]
            if count == 0:
                print("First launch detected: Automatically indexing sample Nexora handbooks...")
                await documents.load_sample_documents()
    except Exception as e:
        print("Note: Sample documents will be loaded on demand:", str(e))

    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Interactive Educational Web Application for RAG, AI Agents, Agentic RAG, and Chunk Size Comparison",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local classroom development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(documents.router)
app.include_router(rag.router)
app.include_router(agent.router)
app.include_router(agentic_rag.router)
app.include_router(chunk_lab.router)
app.include_router(settings_router.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "status": "online"
    }

@app.get("/health")
@app.get("/api/health")
def api_health():
    from backend.app.routers.settings_router import health_check
    return health_check()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred", "detail": str(exc)}
    )

