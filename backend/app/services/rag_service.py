import time
import json
import uuid
from typing import List, Dict, Any, Optional
from backend.app.core.database import get_db
from backend.app.services.embedding_service import embedding_service
from backend.app.services.llm_service import llm_service

class RAGService:
    async def process_document_indexing(
        self,
        document_id: str,
        chunk_size: int = 256,
        chunk_overlap: int = 30
    ) -> Dict[str, Any]:
        """
        Extracts pages from DB, chunks with token-awareness, and indexes into ChromaDB.
        """
        with get_db() as db:
            doc = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
            if not doc:
                raise ValueError(f"Document {document_id} not found")
            
            pages_rows = db.execute(
                "SELECT page_number, page_text, char_count FROM document_pages WHERE document_id = ? ORDER BY page_number",
                (document_id,)
            ).fetchall()

        pages_data = [{"page_number": p["page_number"], "text": p["page_text"]} for p in pages_rows]
        
        # 1. Chunk document
        start_chunk_t = time.perf_counter()
        chunks = embedding_service.chunk_document(pages_data, chunk_size, chunk_overlap)
        chunking_duration_ms = (time.perf_counter() - start_chunk_t) * 1000.0

        # 2. Get or create Chroma collection & embed
        start_embed_t = time.perf_counter()
        collection, collection_name, is_new = embedding_service.get_or_create_collection(
            document_hash=doc["document_hash"],
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            chunks=chunks,
            document_id=doc["id"],
            document_filename=doc["original_filename"]
        )
        indexing_duration_ms = (time.perf_counter() - start_embed_t) * 1000.0

        # 3. Store chunk config and chunks in SQLite for inspection
        config_id = f"cfg_{uuid.uuid4().hex[:8]}"
        with get_db() as db:
            db.execute(
                "INSERT OR REPLACE INTO chunk_configs (id, document_id, chunk_size, chunk_overlap, embedding_model, collection_name, total_chunks) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (config_id, document_id, chunk_size, chunk_overlap, embedding_service.get_model().__class__.__name__, collection_name, len(chunks))
            )
            
            # Delete old chunks for this config if reindexing
            db.execute("DELETE FROM chunks WHERE chunk_config_id = ?", (config_id,))
            
            chunk_inserts = [
                (c["id"], config_id, document_id, c["chunk_index"], c["page_number"], c["chunk_text"], c["token_count"])
                for c in chunks
            ]
            db.executemany(
                "INSERT INTO chunks (id, chunk_config_id, document_id, chunk_index, page_number, chunk_text, token_count) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                chunk_inserts
            )
            db.commit()

        return {
            "config_id": config_id,
            "document_id": document_id,
            "collection_name": collection_name,
            "total_chunks": len(chunks),
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap,
            "chunking_duration_ms": round(chunking_duration_ms, 2),
            "indexing_duration_ms": round(indexing_duration_ms, 2),
            "is_cached": not is_new,
            "sample_chunks": chunks[:5]
        }

    async def execute_rag_pipeline(
        self,
        document_ids: List[str],
        question: str,
        chunk_size: int = 256,
        chunk_overlap: int = 30,
        top_k: int = 5,
        similarity_threshold: float = 0.0,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes complete RAG pipeline and records inspectable visual steps.
        """
        if not document_ids:
            raise ValueError("At least one document must be selected.")
        if not question.strip():
            raise ValueError("Question cannot be empty.")

        # Ensure all selected documents are indexed with this configuration
        collection_names = []
        doc_details = []
        total_chunks_available = 0

        with get_db() as db:
            for d_id in document_ids:
                doc = db.execute("SELECT * FROM documents WHERE id = ?", (d_id,)).fetchone()
                if not doc:
                    continue
                doc_details.append({
                    "id": doc["id"],
                    "filename": doc["original_filename"],
                    "hash": doc["document_hash"],
                    "page_count": doc["page_count"]
                })

        for d in doc_details:
            proc_res = await self.process_document_indexing(d["id"], chunk_size, chunk_overlap)
            collection_names.append(proc_res["collection_name"])
            total_chunks_available += proc_res["total_chunks"]

        # Step 1: Vector Retrieval across all collections
        all_retrieved = []
        total_retrieval_latency = 0.0
        query_embedding: List[float] = []

        for col_name in collection_names:
            retrieved, latency, q_emb = embedding_service.query_collection(
                collection_name=col_name,
                query=question,
                top_k=top_k,
                similarity_threshold=similarity_threshold
            )
            all_retrieved.extend(retrieved)
            total_retrieval_latency += latency
            if not query_embedding:
                query_embedding = q_emb

        # Sort combined results by similarity score descending and take top_k
        all_retrieved.sort(key=lambda x: x["similarity_score"], reverse=True)
        final_retrieved = all_retrieved[:top_k]

        # Step 2: Format prompt augmentation
        context_parts = []
        context_tokens_count = 0
        for i, c in enumerate(final_retrieved):
            doc_name = c.get("document_filename", "Document")
            page_no = c.get("page_number", 1)
            text = c.get("chunk_text", "")
            tokens = c.get("token_count", 0)
            context_tokens_count += tokens
            context_parts.append(
                f"[Source {i+1} | Document: {doc_name} | Page: {page_no} | Chunk ID: {c['chunk_id']} | Score: {c['similarity_score']}]\n{text}"
            )

        context_string = "\n\n---\n\n".join(context_parts) if context_parts else "NO RELEVANT EXCERPTS RETRIEVED."

        system_prompt = (
            "You are an expert AI educational assistant for the AI Learning Lab.\n"
            "Your task is to answer the user's question using ONLY the provided context excerpts.\n"
            "Rules:\n"
            "1. Answer strictly based on the provided context.\n"
            "2. Always cite the exact source document name, page number, and chunk ID for your assertions.\n"
            "3. If the context does not contain sufficient information to answer the question, explicitly state: "
            "'The retrieved documents do not contain sufficient information to answer this question.'\n"
            "4. NEVER fabricate page numbers, chunk IDs, or policies."
        )

        user_prompt = (
            f"Context Excerpts:\n{context_string}\n\n"
            f"Question: {question}\n\n"
            f"Provide a clear, grounded answer with exact document and page citations."
        )

        # Step 3: LLM Answer Generation
        gen_res = await llm_service.generate_response(
            prompt=user_prompt,
            system_prompt=system_prompt,
            provider=provider,
            model=model
        )

        # Vector embedding abbreviated representation for UI
        emb_sample = [round(x, 4) for x in query_embedding[:8]] + ["..."] + [round(x, 4) for x in query_embedding[-3:]]

        # Assemble full educational inspection stages
        pipeline_stages = {
            "pdf_input": {
                "documents": doc_details,
                "total_documents": len(doc_details)
            },
            "extraction": {
                "status": "completed",
                "method": "PyMuPDF Page Extractor",
                "total_pages": sum(d["page_count"] for d in doc_details)
            },
            "chunking": {
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap,
                "total_chunks_created": total_chunks_available,
                "tokenizer": "BAAI/bge-small-en-v1.5 (HuggingFace AutoTokenizer)"
            },
            "embedding": {
                "model": "BAAI/bge-small-en-v1.5",
                "dimension": 384,
                "distance_metric": "Cosine Similarity",
                "query_embedding_preview": emb_sample,
                "query_token_count": embedding_service.count_tokens(question)
            },
            "vector_db": {
                "engine": "ChromaDB Persistent Client",
                "collections_queried": collection_names,
                "top_k": top_k,
                "similarity_threshold": similarity_threshold
            },
            "retrieval": {
                "retrieved_count": len(final_retrieved),
                "retrieval_latency_ms": round(total_retrieval_latency, 2),
                "chunks": final_retrieved
            },
            "prompt_augmentation": {
                "system_prompt": system_prompt,
                "user_prompt": user_prompt,
                "context_tokens": context_tokens_count
            },
            "llm_generation": {
                "provider": gen_res["provider"],
                "model": gen_res["model"],
                "generation_latency_ms": gen_res["latency_ms"],
                "is_simulated": gen_res.get("is_simulated", False)
            }
        }

        return {
            "question": question,
            "answer": gen_res["answer"],
            "sources": final_retrieved,
            "context_tokens": context_tokens_count,
            "retrieval_latency_ms": round(total_retrieval_latency, 2),
            "generation_latency_ms": gen_res["latency_ms"],
            "total_latency_ms": round(total_retrieval_latency + gen_res["latency_ms"], 2),
            "pipeline": pipeline_stages
        }

rag_service = RAGService()

