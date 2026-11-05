import os
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.services.llm_service import llm_service
from backend.app.services.embedding_service import embedding_service, HAS_FAISS

router = APIRouter(prefix="/api/settings", tags=["Settings & Health"])

class ProviderSettingsUpdate(BaseModel):
    provider: str
    gemini_model: Optional[str] = None
    groq_model: Optional[str] = None
    ollama_model: Optional[str] = None
    ollama_url: Optional[str] = None

class APIKeysUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None

@router.get("")
def get_settings():
    active_provider = llm_service.get_active_provider()
    return {
        "active_provider": active_provider,
        "providers": {
            "gemini": {
                "name": "Google Gemini Developer API",
                "model": llm_service.get_model_for_provider("gemini"),
                "has_key": bool(llm_service.get_raw_api_key("gemini")),
                "key_preview": llm_service.get_api_key_masked("gemini"),
                "available_models": ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
            },
            "groq": {
                "name": "Groq Cloud API",
                "model": llm_service.get_model_for_provider("groq"),
                "has_key": bool(llm_service.get_raw_api_key("groq")),
                "key_preview": llm_service.get_api_key_masked("groq"),
                "available_models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
            },
            "ollama": {
                "name": "Ollama Local Models",
                "model": llm_service.get_model_for_provider("ollama"),
                "base_url": llm_service.get_setting("OLLAMA_BASE_URL", settings.OLLAMA_BASE_URL),
                "has_key": True,
                "key_preview": "Local (No Key Required)",
                "available_models": ["llama3.2", "mistral", "phi3", "qwen2.5"]
            }
        },
        "embedding": {
            "model_name": settings.EMBEDDING_MODEL_NAME,
            "dimension": settings.EMBEDDING_DIMENSION,
            "max_sequence_length": settings.MAX_SEQUENCE_LENGTH,
            "device": "cpu (local)",
            "tokenizer": "AutoTokenizer (HuggingFace)"
        },
        "storage": {
            "type": settings.STORAGE_TYPE,
            "local_uploads_dir": str(settings.UPLOADS_DIR),
            "chroma_dir": str(settings.CHROMA_DIR)
        }
    }

@router.post("/provider")
def update_provider_settings(req: ProviderSettingsUpdate):
    if req.provider not in ["gemini", "groq", "ollama"]:
        raise HTTPException(status_code=400, detail="Provider must be 'gemini', 'groq', or 'ollama'")

    llm_service.set_setting("DEFAULT_PROVIDER", req.provider)
    if req.gemini_model:
        llm_service.set_setting("GEMINI_MODEL", req.gemini_model)
    if req.groq_model:
        llm_service.set_setting("GROQ_MODEL", req.groq_model)
    if req.ollama_model:
        llm_service.set_setting("OLLAMA_MODEL", req.ollama_model)
    if req.ollama_url:
        llm_service.set_setting("OLLAMA_BASE_URL", req.ollama_url)

    return {"status": "success", "active_provider": req.provider}

@router.post("/keys")
def update_api_keys(req: APIKeysUpdate):
    if req.gemini_api_key is not None:
        llm_service.set_setting("GEMINI_API_KEY", req.gemini_api_key.strip())
        os.environ["GEMINI_API_KEY"] = req.gemini_api_key.strip()
    if req.groq_api_key is not None:
        llm_service.set_setting("GROQ_API_KEY", req.groq_api_key.strip())
        os.environ["GROQ_API_KEY"] = req.groq_api_key.strip()

    return {"status": "keys_saved_securely"}

@router.get("/health")
def health_check():
    # Verify DB
    db_ok = False
    doc_count = 0
    try:
        with get_db() as db:
            doc_count = db.execute("SELECT COUNT(*) as c FROM documents").fetchone()["c"]
            db_ok = True
    except Exception:
        pass

    # Verify Chroma
    chroma_ok = False
    try:
        client = embedding_service.get_chroma_client()
        cols = client.list_collections()
        chroma_ok = True
    except Exception:
        pass

    # Verify FAISS
    faiss_ok = HAS_FAISS

    return {
        "status": "healthy" if db_ok and (chroma_ok or faiss_ok) else "degraded",
        "database": {"connected": db_ok, "documents_registered": doc_count},
        "vector_stores": {
            "faiss": {"connected": faiss_ok, "index_dir": str(settings.FAISS_DIR)},
            "chromadb": {"connected": chroma_ok}
        },
        "chromadb": {"connected": chroma_ok},
        "faiss": {"connected": faiss_ok},
        "embedding_model": {"model": settings.EMBEDDING_MODEL_NAME, "status": "ready"}
    }

@router.get("/limits")
def get_rate_limits():
    """Returns token limits, request quotas, and reset intervals for all models."""
    from datetime import datetime, timezone, timedelta

    now_utc = datetime.now(timezone.utc)
    
    # Calculate next UTC Midnight (for Groq)
    next_midnight_utc = (now_utc + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    seconds_to_groq_reset = int((next_midnight_utc - now_utc).total_seconds())

    # Calculate next Pacific Midnight (for Gemini, PT is UTC-7 in PDT or UTC-8 in PST; 08:00 UTC)
    # Using 08:00 UTC as Pacific Midnight (PST)
    candidate_gemini_reset = now_utc.replace(hour=8, minute=0, second=0, microsecond=0)
    if candidate_gemini_reset <= now_utc:
        candidate_gemini_reset += timedelta(days=1)
    seconds_to_gemini_reset = int((candidate_gemini_reset - now_utc).total_seconds())

    active_provider = llm_service.get_active_provider()

    return {
        "server_time_utc": now_utc.isoformat(),
        "active_provider": active_provider,
        "reset_cadence": {
            "rolling_minute_window_seconds": 60,
            "groq_daily_reset_utc": next_midnight_utc.isoformat(),
            "groq_seconds_until_reset": seconds_to_groq_reset,
            "gemini_daily_reset_utc": candidate_gemini_reset.isoformat(),
            "gemini_seconds_until_reset": seconds_to_gemini_reset,
        },
        "models": [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "provider": "gemini",
                "provider_name": "Google Gemini",
                "tier": "Free Tier",
                "is_active": active_provider == "gemini",
                "has_key": bool(llm_service.get_raw_api_key("gemini")),
                "limits": {
                    "rpm": 15,
                    "tpm": 1000000,
                    "rpd": 1500,
                    "context_window": 1048576,
                    "max_output_tokens": 8192
                },
                "reset_schedule": {
                    "minute_reset": "Resets every 60 seconds (rolling sliding window)",
                    "daily_reset": "Resets daily at 00:00 PT (08:00 UTC)",
                    "seconds_to_daily_reset": seconds_to_gemini_reset
                },
                "recommended_for": "Large document queries (up to 1M tokens), multi-step Agent reasoning, fast answers",
                "rate_limit_mitigation": "With 1M TPM and 15 RPM, stay within 1 request per 4 seconds during automated batch tests."
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "provider": "gemini",
                "provider_name": "Google Gemini",
                "tier": "Free Tier",
                "is_active": False,
                "has_key": bool(llm_service.get_raw_api_key("gemini")),
                "limits": {
                    "rpm": 15,
                    "tpm": 1000000,
                    "rpd": 1500,
                    "context_window": 1048576,
                    "max_output_tokens": 8192
                },
                "reset_schedule": {
                    "minute_reset": "Resets every 60 seconds (rolling sliding window)",
                    "daily_reset": "Resets daily at 00:00 PT (08:00 UTC)",
                    "seconds_to_daily_reset": seconds_to_gemini_reset
                },
                "recommended_for": "High-throughput general educational synthesis and chunk evaluation",
                "rate_limit_mitigation": "15 requests per minute ceiling. If exceeded, Gemini returns HTTP 429."
            },
            {
                "id": "llama-3.3-70b-versatile",
                "name": "Llama 3.3 70B Versatile",
                "provider": "groq",
                "provider_name": "Groq Cloud",
                "tier": "Free Plan",
                "is_active": active_provider == "groq",
                "has_key": bool(llm_service.get_raw_api_key("groq")),
                "limits": {
                    "rpm": 30,
                    "tpm": 14000,
                    "rpd": 14400,
                    "context_window": 128000,
                    "max_output_tokens": 32768
                },
                "reset_schedule": {
                    "minute_reset": "Resets every 60 seconds (rolling window)",
                    "daily_reset": "Resets daily at 00:00 UTC (Midnight UTC)",
                    "seconds_to_daily_reset": seconds_to_groq_reset
                },
                "recommended_for": "Ultra-low latency inference (~300 tokens/sec) and complex tool reasoning",
                "rate_limit_mitigation": "14,000 TPM limit means keeping prompt context under 10k tokens per query to avoid burst throttling."
            },
            {
                "id": "llama-3.1-8b-instant",
                "name": "Llama 3.1 8B Instant",
                "provider": "groq",
                "provider_name": "Groq Cloud",
                "tier": "Free Plan",
                "is_active": False,
                "has_key": bool(llm_service.get_raw_api_key("groq")),
                "limits": {
                    "rpm": 30,
                    "tpm": 30000,
                    "rpd": 14400,
                    "context_window": 128000,
                    "max_output_tokens": 8192
                },
                "reset_schedule": {
                    "minute_reset": "Resets every 60 seconds (rolling window)",
                    "daily_reset": "Resets daily at 00:00 UTC (Midnight UTC)",
                    "seconds_to_daily_reset": seconds_to_groq_reset
                },
                "recommended_for": "Fast classification, lightweight date & tool calculations",
                "rate_limit_mitigation": "High TPM allowance (30k TPM) supports quick multi-chunk queries."
            },
            {
                "id": "llama3.2",
                "name": "Ollama Llama 3.2 (Local)",
                "provider": "ollama",
                "provider_name": "Ollama Local",
                "tier": "100% Free & Offline",
                "is_active": active_provider == "ollama",
                "has_key": True,
                "limits": {
                    "rpm": "Unlimited",
                    "tpm": "Unlimited (RAM/VRAM bounded)",
                    "rpd": "Unlimited",
                    "context_window": 131072,
                    "max_output_tokens": 8192
                },
                "reset_schedule": {
                    "minute_reset": "None (No rate limiting)",
                    "daily_reset": "None (Local machine compute)",
                    "seconds_to_daily_reset": 0
                },
                "recommended_for": "Offline development, zero API cost, completely private corporate data",
                "rate_limit_mitigation": "No external limits. Performance depends on local CPU/GPU compute speed."
            },
            {
                "id": "BAAI/bge-small-en-v1.5",
                "name": "BGE Small EN v1.5 (Local Embeddings)",
                "provider": "sentence_transformers",
                "provider_name": "Local HuggingFace",
                "tier": "Local Model",
                "is_active": True,
                "has_key": True,
                "limits": {
                    "rpm": "Unlimited",
                    "tpm": "Unlimited",
                    "rpd": "Unlimited",
                    "context_window": 512,
                    "max_output_tokens": 384
                },
                "reset_schedule": {
                    "minute_reset": "None (Local inference)",
                    "daily_reset": "None",
                    "seconds_to_daily_reset": 0
                },
                "recommended_for": "Document token-aware vector embeddings & FAISS vector indexing",
                "rate_limit_mitigation": "Strict architectural ceiling of 512 tokens per chunk to prevent truncation."
            }
        ]
    }

