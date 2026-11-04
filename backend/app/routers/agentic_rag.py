from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
import json
from backend.app.core.database import get_db
from backend.app.services.agentic_rag_service import agentic_rag_service

router = APIRouter(prefix="/api/agentic-rag", tags=["Agentic RAG Studio"])

class AgenticRAGRequest(BaseModel):
    question: str
    document_ids: Optional[List[str]] = None
    max_retries: int = Field(3, ge=1, le=5)
    chunk_size: int = Field(256, ge=32, le=512)
    chunk_overlap: int = Field(30, ge=0)
    provider: Optional[str] = None
    model: Optional[str] = None

@router.post("/query")
async def run_agentic_rag(req: AgenticRAGRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        result = await agentic_rag_service.execute_agentic_rag(
            question=req.question,
            document_ids=req.document_ids,
            max_retries=req.max_retries,
            chunk_size=req.chunk_size,
            chunk_overlap=req.chunk_overlap,
            provider=req.provider,
            model=req.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/run/{run_id}")
def get_agentic_rag_run(run_id: str):
    with get_db() as db:
        run = db.execute("SELECT * FROM agentic_rag_runs WHERE id = ?", (run_id,)).fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Agentic RAG run not found")
        
        run_dict = dict(run)
        try:
            run_dict["plan"] = json.loads(run_dict["plan_json"]) if run_dict["plan_json"] else {}
        except Exception:
            pass
        try:
            run_dict["sub_questions"] = json.loads(run_dict["sub_questions_json"]) if run_dict["sub_questions_json"] else []
        except Exception:
            pass
        try:
            run_dict["evidence"] = json.loads(run_dict["evidence_json"]) if run_dict["evidence_json"] else []
        except Exception:
            pass

        return run_dict

