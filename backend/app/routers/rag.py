from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query
from backend.app.core.database import get_db
from backend.app.services.rag_service import rag_service

router = APIRouter(prefix="/api/rag", tags=["RAG Explorer"])

class ProcessRequest(BaseModel):
    document_ids: List[str]
    chunk_size: int = Field(256, ge=32, le=512)
    chunk_overlap: int = Field(30, ge=0)

class QueryRequest(BaseModel):
    document_ids: List[str]
    question: str
    chunk_size: int = Field(256, ge=32, le=512)
    chunk_overlap: int = Field(30, ge=0)
    top_k: int = Field(5, ge=1, le=20)
    similarity_threshold: float = Field(0.0, ge=0.0, le=1.0)
    provider: Optional[str] = None
    model: Optional[str] = None

@router.post("/process")
async def process_rag_documents(req: ProcessRequest):
    if req.chunk_overlap >= req.chunk_size:
        raise HTTPException(status_code=400, detail="Chunk overlap must be less than chunk size")
    
    results = []
    for doc_id in req.document_ids:
        try:
            res = await rag_service.process_document_indexing(doc_id, req.chunk_size, req.chunk_overlap)
            results.append(res)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed processing document {doc_id}: {str(e)}")
    return {"results": results}

@router.post("/query")
async def query_rag(req: QueryRequest):
    try:
        response = await rag_service.execute_rag_pipeline(
            document_ids=req.document_ids,
            question=req.question,
            chunk_size=req.chunk_size,
            chunk_overlap=req.chunk_overlap,
            top_k=req.top_k,
            similarity_threshold=req.similarity_threshold,
            provider=req.provider,
            model=req.model
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/chunks/{document_id}")
def get_document_chunks(
    document_id: str,
    chunk_size: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200)
):
    with get_db() as db:
        query = """
            SELECT c.*, cfg.chunk_size, cfg.chunk_overlap 
            FROM chunks c
            JOIN chunk_configs cfg ON c.chunk_config_id = cfg.id
            WHERE c.document_id = ?
        """
        params = [document_id]
        if chunk_size:
            query += " AND cfg.chunk_size = ?"
            params.append(chunk_size)
        query += " ORDER BY c.chunk_index ASC LIMIT ?"
        params.append(limit)

        rows = db.execute(query, tuple(params)).fetchall()
        return [dict(r) for r in rows]

