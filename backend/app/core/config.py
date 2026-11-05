import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Storage directories (configurable via STORAGE_DIR env var, defaults to root data/ or backend/storage)
_env_storage = os.environ.get("STORAGE_DIR")
if _env_storage:
    STORAGE_DIR = Path(_env_storage)
elif (BASE_DIR.parent / "data").exists():
    STORAGE_DIR = BASE_DIR.parent / "data"
else:
    STORAGE_DIR = BASE_DIR / "storage"

UPLOADS_DIR = STORAGE_DIR / "uploads"
CHROMA_DIR = STORAGE_DIR / "chroma_db"
FAISS_DIR = STORAGE_DIR / "faiss_index"

# Sample documents directory (works in local dev, Docker container, and custom installs)
_sample_candidate_1 = BASE_DIR.parent / "sample_documents"
_sample_candidate_2 = BASE_DIR / "sample_documents"
_sample_candidate_3 = Path("/app/sample_documents")
if _sample_candidate_1.exists():
    SAMPLE_DOCS_DIR = _sample_candidate_1
elif _sample_candidate_2.exists():
    SAMPLE_DOCS_DIR = _sample_candidate_2
elif _sample_candidate_3.exists():
    SAMPLE_DOCS_DIR = _sample_candidate_3
else:
    SAMPLE_DOCS_DIR = _sample_candidate_1

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
FAISS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "AI Learning Lab"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Storage
    STORAGE_TYPE: str = "local" # "local" or "supabase"
    STORAGE_DIR: Path = STORAGE_DIR
    UPLOADS_DIR: Path = UPLOADS_DIR
    CHROMA_DIR: Path = CHROMA_DIR
    FAISS_DIR: Path = FAISS_DIR
    VECTOR_DB: str = "faiss"  # "faiss" or "chroma"
    DATABASE_PATH: Path = STORAGE_DIR / "app.db"
    
    # LLM Settings
    DEFAULT_PROVIDER: str = "gemini"  # "gemini", "groq", "ollama"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    
    # Embedding Model
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384
    MAX_SEQUENCE_LENGTH: int = 512
    
    # Supabase optional settings (for deployment)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET: str = "pdf-documents"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        extra="allow"
    )

settings = Settings()

