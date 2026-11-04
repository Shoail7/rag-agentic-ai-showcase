import uuid
import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Response, Query
from fastapi.responses import FileResponse
from backend.app.core.config import settings, SAMPLE_DOCS_DIR
from backend.app.core.database import get_db
from backend.app.services.storage_service import storage_service
from backend.app.services.pdf_service import pdf_service, PDFProcessingError
from backend.app.services.embedding_service import embedding_service
from backend.app.services.rag_service import rag_service

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.get("")
def list_documents():
    with get_db() as db:
        rows = db.execute("""
            SELECT d.*, 
                   (SELECT COUNT(*) FROM chunks WHERE document_id = d.id) as chunk_count
            FROM documents d 
            ORDER BY d.upload_date DESC
        """).fetchall()
        return [dict(r) for r in rows]

@router.get("/{document_id}")
def get_document(document_id: str):
    with get_db() as db:
        doc = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        pages = db.execute(
            "SELECT page_number, char_count, SUBSTR(page_text, 1, 300) as snippet FROM document_pages WHERE document_id = ? ORDER BY page_number",
            (document_id,)
        ).fetchall()
        
        chunk_count = db.execute("SELECT COUNT(*) as cnt FROM chunks WHERE document_id = ?", (document_id,)).fetchone()["cnt"]

        return {
            **dict(doc),
            "chunk_count": chunk_count,
            "pages": [dict(p) for p in pages]
        }

@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    results = []
    
    for file in files:
        try:
            content = await file.read()
            # 1. Validate
            pdf_service.validate_pdf(content, file.filename)
            doc_hash = pdf_service.calculate_hash(content)

            # 2. Check duplicate
            with get_db() as db:
                existing = db.execute("SELECT * FROM documents WHERE document_hash = ?", (doc_hash,)).fetchone()
                if existing:
                    results.append({
                        "filename": file.filename,
                        "status": "duplicate",
                        "document_id": existing["id"],
                        "message": f"Document already exists as '{existing['original_filename']}'"
                    })
                    continue

            # 3. Extract text & metadata
            extracted = pdf_service.extract_document(content)
            doc_id = f"doc_{uuid.uuid4().hex[:10]}"
            saved_filename = f"{doc_id}_{Path(file.filename).name}"
            
            # 4. Save to persistent storage
            storage_path = storage_service.save(content, saved_filename)

            # 5. Insert into Database
            with get_db() as db:
                db.execute(
                    "INSERT INTO documents (id, filename, original_filename, file_size, page_count, char_count, document_hash, processing_status, storage_location, extracted_text_preview, metadata_json) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?)",
                    (
                        doc_id,
                        saved_filename,
                        file.filename,
                        len(content),
                        extracted["page_count"],
                        extracted["char_count"],
                        doc_hash,
                        storage_path,
                        extracted["preview_text"],
                        json.dumps(extracted["pdf_metadata"])
                    )
                )

                # Store per-page text
                page_rows = [
                    (doc_id, p["page_number"], p["text"], p["char_count"])
                    for p in extracted["pages"]
                ]
                db.executemany(
                    "INSERT INTO document_pages (document_id, page_number, page_text, char_count) VALUES (?, ?, ?, ?)",
                    page_rows
                )
                db.commit()

            # Pre-index default chunks (256/30) in background for instant search
            try:
                await rag_service.process_document_indexing(doc_id, chunk_size=256, chunk_overlap=30)
            except Exception:
                pass

            results.append({
                "filename": file.filename,
                "status": "ready",
                "document_id": doc_id,
                "pages": extracted["page_count"],
                "chars": extracted["char_count"]
            })

        except PDFProcessingError as pe:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": str(pe)
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": f"Processing failed: {str(e)}"
            })

    return {"uploaded": results}

@router.post("/load-samples")
async def load_sample_documents():
    """1-Click loading of the demonstration Nexora handbooks (2024 and 2025)."""
    loaded = []
    sample_files = [
        "Nexora_Employee_Handbook_2024.pdf",
        "Nexora_Employee_Handbook_2025.pdf"
    ]
    for fname in sample_files:
        src = SAMPLE_DOCS_DIR / fname
        if not src.exists():
            continue

        with open(src, "rb") as f:
            content = f.read()

        doc_hash = pdf_service.calculate_hash(content)
        with get_db() as db:
            existing = db.execute("SELECT id FROM documents WHERE document_hash = ?", (doc_hash,)).fetchone()
            if existing:
                loaded.append({"filename": fname, "document_id": existing["id"], "status": "already_loaded"})
                continue

        extracted = pdf_service.extract_document(content)
        doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        saved_filename = f"{doc_id}_{fname}"
        storage_path = storage_service.save(content, saved_filename)

        with get_db() as db:
            db.execute(
                "INSERT INTO documents (id, filename, original_filename, file_size, page_count, char_count, document_hash, processing_status, storage_location, extracted_text_preview, metadata_json) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?)",
                (
                    doc_id,
                    saved_filename,
                    fname,
                    len(content),
                    extracted["page_count"],
                    extracted["char_count"],
                    doc_hash,
                    storage_path,
                    extracted["preview_text"],
                    json.dumps(extracted["pdf_metadata"])
                )
            )
            page_rows = [(doc_id, p["page_number"], p["text"], p["char_count"]) for p in extracted["pages"]]
            db.executemany("INSERT INTO document_pages (document_id, page_number, page_text, char_count) VALUES (?, ?, ?, ?)", page_rows)
            db.commit()

        # Pre-index default 256/30 chunks
        try:
            await rag_service.process_document_indexing(doc_id, chunk_size=256, chunk_overlap=30)
        except Exception:
            pass

        loaded.append({"filename": fname, "document_id": doc_id, "status": "loaded", "pages": extracted["page_count"]})

    return {"results": loaded}

@router.get("/{document_id}/preview")
def preview_page(document_id: str, page: int = Query(1, ge=1)):
    with get_db() as db:
        doc = db.execute("SELECT filename, page_count FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if page > doc["page_count"]:
            raise HTTPException(status_code=400, detail=f"Page {page} exceeds total pages ({doc['page_count']})")

    file_bytes = storage_service.read(doc["filename"])
    img_bytes = pdf_service.render_page_image(file_bytes, page_number=page, zoom=1.4)
    return Response(content=img_bytes, media_type="image/png")

@router.get("/{document_id}/download")
def download_document(document_id: str):
    with get_db() as db:
        doc = db.execute("SELECT filename, original_filename FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

    file_path = storage_service.get_local_path(doc["filename"])
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Original file not found in storage")

    return FileResponse(
        path=str(file_path),
        filename=doc["original_filename"],
        media_type="application/pdf"
    )

@router.get("/{document_id}/pages/{page_number}")
def get_page_text(document_id: str, page_number: int):
    with get_db() as db:
        row = db.execute(
            "SELECT page_number, page_text, char_count FROM document_pages WHERE document_id = ? AND page_number = ?",
            (document_id, page_number)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Page not found")
        return dict(row)

@router.delete("/{document_id}")
def delete_document(document_id: str):
    with get_db() as db:
        doc = db.execute("SELECT filename, document_hash FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # 1. Delete associated ChromaDB collections
        embedding_service.delete_collections_for_doc(doc["document_hash"])

        # 2. Delete database records (Cascades to pages, chunks, configs, experiments)
        db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        db.commit()

    # 3. Delete file from physical storage
    storage_service.delete(doc["filename"])

    return {"status": "deleted", "document_id": document_id}

@router.post("/{document_id}/process")
async def reprocess_document(
    document_id: str,
    chunk_size: int = Query(256, ge=32, le=512),
    chunk_overlap: int = Query(30, ge=0)
):
    try:
        res = await rag_service.process_document_indexing(document_id, chunk_size, chunk_overlap)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

