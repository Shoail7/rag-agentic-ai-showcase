import json
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from backend.app.core.database import get_db
from backend.app.services.chunk_lab_service import chunk_lab_service

router = APIRouter(prefix="/api/chunk-lab", tags=["Chunk Size Laboratory"])

class ExperimentConfigItem(BaseModel):
    chunk_size: int = Field(256, ge=32, le=512)
    chunk_overlap: int = Field(30, ge=0)
    top_k: int = Field(5, ge=1, le=20)

class CompareRequest(BaseModel):
    document_id: str
    question: str
    config_a: ExperimentConfigItem
    config_b: ExperimentConfigItem
    config_c: ExperimentConfigItem
    provider: Optional[str] = None
    model: Optional[str] = None

@router.post("/compare")
async def compare_chunk_sizes(req: CompareRequest):
    if not req.document_id:
        raise HTTPException(status_code=400, detail="A PDF document must be selected.")
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    try:
        res = await chunk_lab_service.run_comparison_experiment(
            document_id=req.document_id,
            question=req.question,
            config_a=req.config_a.model_dump(),
            config_b=req.config_b.model_dump(),
            config_c=req.config_c.model_dump(),
            provider=req.provider,
            model=req.model
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/experiment/{experiment_id}")
def get_experiment(experiment_id: str):
    with get_db() as db:
        exp = db.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,)).fetchone()
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        results = db.execute("SELECT * FROM experiment_results WHERE experiment_id = ? ORDER BY chunk_size ASC", (experiment_id,)).fetchall()
        parsed_results = []
        for r in results:
            r_dict = dict(r)
            try:
                r_dict["retrieved_chunks"] = json.loads(r_dict["retrieved_chunks_json"])
            except Exception:
                r_dict["retrieved_chunks"] = []
            try:
                r_dict["metrics"] = json.loads(r_dict["metrics_json"])
            except Exception:
                r_dict["metrics"] = {}
            parsed_results.append(r_dict)

        return {
            **dict(exp),
            "results": parsed_results
        }

