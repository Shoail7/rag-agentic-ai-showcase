import time
import json
import uuid
import re
from typing import List, Dict, Any, Optional
from backend.app.core.database import get_db
from backend.app.services.embedding_service import embedding_service
from backend.app.services.rag_service import rag_service
from backend.app.services.llm_service import llm_service

class AgenticRAGService:
    MAX_RETRIES = 3

    async def execute_agentic_rag(
        self,
        question: str,
        document_ids: Optional[List[str]] = None,
        max_retries: int = 3,
        chunk_size: int = 256,
        chunk_overlap: int = 30,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        run_id = f"arag_{uuid.uuid4().hex[:10]}"
        start_t = time.perf_counter()

        # Step 1: Document Discovery / Selection
        with get_db() as db:
            if not document_ids:
                # If no doc selected explicitly, select all ready documents from the library
                doc_rows = db.execute("SELECT id, original_filename, document_hash FROM documents WHERE processing_status = 'ready'").fetchall()
            else:
                placeholders = ",".join("?" for _ in document_ids)
                doc_rows = db.execute(f"SELECT id, original_filename, document_hash FROM documents WHERE id IN ({placeholders})", tuple(document_ids)).fetchall()

        if not doc_rows:
            raise ValueError("No ready documents available in the library. Please upload or process documents first.")

        available_docs = [{"id": r["id"], "filename": r["original_filename"], "hash": r["document_hash"]} for r in doc_rows]

        # Step 2: Agent Planner & Question Decomposition
        plan, sub_questions = self._decompose_question(question, available_docs)

        # Step 3: Iterative Multi-Source Retrieval with Quality Evaluation & Retry
        execution_trace: List[Dict[str, Any]] = []
        collected_evidence: List[Dict[str, Any]] = []
        total_retries = 0

        for sq in sub_questions:
            sq_id = sq["id"]
            target_doc = sq["target_doc"]
            initial_query = sq["search_query"]
            required_aspect = sq.get("aspect", "")

            # Ensure document is indexed
            proc = await rag_service.process_document_indexing(target_doc["id"], chunk_size, chunk_overlap)
            collection_name = proc["collection_name"]

            # Loop with quality evaluation & query rewriting
            attempt = 1
            query = initial_query
            is_sufficient = False
            best_chunks = []
            evaluation_note = ""

            while attempt <= max_retries and not is_sufficient:
                trace_entry = {
                    "sub_question_id": sq_id,
                    "sub_question": sq["text"],
                    "document": target_doc["filename"],
                    "search_attempt": attempt,
                    "query": query,
                    "timestamp": time.time()
                }

                # Retrieve chunks
                retrieved, latency_ms, _ = embedding_service.query_collection(
                    collection_name=collection_name,
                    query=query,
                    top_k=4,
                    similarity_threshold=0.0
                )

                # Evaluate retrieval quality
                quality_res = self._evaluate_retrieval_quality(retrieved, required_aspect, query)
                is_sufficient = quality_res["is_sufficient"]
                eval_score = quality_res["score"]
                evaluation_note = quality_res["reason"]

                trace_entry["retrieved_count"] = len(retrieved)
                trace_entry["retrieved_chunks"] = retrieved
                trace_entry["quality_score"] = eval_score
                trace_entry["is_sufficient"] = is_sufficient
                trace_entry["evaluation"] = evaluation_note

                best_chunks = retrieved

                if not is_sufficient and attempt < max_retries:
                    total_retries += 1
                    # Rewrite query for next attempt
                    query = self._rewrite_query(query, required_aspect, attempt)
                    trace_entry["retry_action"] = f"Information incomplete. Rewriting query to: '{query}'"
                    attempt += 1
                else:
                    break

                execution_trace.append(trace_entry)

            # Record final trace for this sub-question if not appended
            if not execution_trace or execution_trace[-1].get("search_attempt") != attempt:
                execution_trace.append(trace_entry)

            collected_evidence.append({
                "sub_question": sq["text"],
                "document": target_doc["filename"],
                "document_id": target_doc["id"],
                "final_query": query,
                "attempts": attempt,
                "sufficient": is_sufficient,
                "chunks": best_chunks
            })

        # Step 4: Combine Evidence & Prompt LLM for Grounded Comparison
        synthesis_prompt, combined_context = self._build_synthesis_prompt(question, collected_evidence)
        system_prompt = (
            "You are an expert policy comparison analyst for the AI Learning Lab.\n"
            "Combine the multi-source evidence to answer the user's question.\n"
            "Structure your answer with:\n"
            "1. A clear markdown summary table comparing policies across documents.\n"
            "2. Clear explanation of improvements, reductions, or unchanged policies.\n"
            "3. Grounded citations including document name and page number for each finding.\n"
            "Do NOT fabricate numbers or facts."
        )

        llm_res = await llm_service.generate_response(
            prompt=synthesis_prompt,
            system_prompt=system_prompt,
            provider=provider,
            model=model
        )

        total_duration = round(time.perf_counter() - start_t, 2)

        # Record run in DB
        with get_db() as db:
            db.execute(
                "INSERT INTO agentic_rag_runs (id, user_question, document_ids_json, plan_json, sub_questions_json, evidence_json, retry_count, final_answer, status, completed_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)",
                (
                    run_id,
                    question,
                    json.dumps([d["id"] for d in available_docs]),
                    json.dumps(plan),
                    json.dumps(sub_questions),
                    json.dumps(collected_evidence),
                    total_retries,
                    llm_res["answer"]
                )
            )
            db.commit()

        return {
            "run_id": run_id,
            "question": question,
            "plan": plan,
            "sub_questions": sub_questions,
            "selected_documents": available_docs,
            "execution_trace": execution_trace,
            "retry_count": total_retries,
            "evidence": collected_evidence,
            "final_answer": llm_res["answer"],
            "duration_sec": total_duration,
            "provider": llm_res["provider"],
            "model": llm_res["model"]
        }

    def _decompose_question(self, question: str, docs: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Decomposes complex user question into document-specific sub-questions.
        """
        q_lower = question.lower()
        sub_questions: List[Dict[str, Any]] = []

        # Find documents for 2024 and 2025 if available
        doc_2024 = next((d for d in docs if "2024" in d["filename"]), docs[0] if docs else None)
        doc_2025 = next((d for d in docs if "2025" in d["filename"]), docs[-1] if docs else None)

        # Detect policy aspects mentioned in question
        aspects = []
        if "leave" in q_lower or "annual" in q_lower or "vacation" in q_lower or "carry" in q_lower:
            aspects.append("annual leave and carry forward")
        if "overtime" in q_lower:
            aspects.append("overtime compensation")
        if "medical" in q_lower or "insurance" in q_lower:
            aspects.append("group medical cover")
        if "remote" in q_lower or "hybrid" in q_lower or "home" in q_lower or "wfh" in q_lower:
            aspects.append("remote and hybrid work")
        if "learning" in q_lower or "budget" in q_lower or "training" in q_lower:
            aspects.append("annual learning support")
        if "partner" in q_lower or "paternity" in q_lower:
            aspects.append("partner leave")

        # If question is broad ("compare all" or "comprehensive"), include all key aspects
        if not aspects or "all" in q_lower or "comprehensive" in q_lower or "benefit" in q_lower:
            aspects = [
                "annual leave and carry forward",
                "overtime compensation",
                "remote and hybrid work",
                "group medical cover",
                "annual learning support"
            ]

        # Generate sub-questions for each aspect and document
        idx = 1
        for asp in aspects:
            if doc_2024:
                sub_questions.append({
                    "id": f"sq_{idx}",
                    "text": f"What is the {asp} policy in the 2024 Employee Handbook?",
                    "target_doc": doc_2024,
                    "search_query": f"2024 policy schedule {asp} entitlement",
                    "aspect": asp
                })
                idx += 1
            if doc_2025 and doc_2025["id"] != (doc_2024["id"] if doc_2024 else None):
                sub_questions.append({
                    "id": f"sq_{idx}",
                    "text": f"What is the {asp} policy in the 2025 Employee Handbook?",
                    "target_doc": doc_2025,
                    "search_query": f"2025 policy schedule {asp} entitlement",
                    "aspect": asp
                })
                idx += 1

        plan = {
            "strategy": "Multi-Document Decomposed Retrieval with Quality Verification",
            "aspects_identified": aspects,
            "target_documents": [d["filename"] for d in docs],
            "total_sub_queries": len(sub_questions),
            "max_retries_allowed": self.MAX_RETRIES
        }

        return plan, sub_questions

    def _evaluate_retrieval_quality(self, chunks: List[Dict[str, Any]], aspect: str, query: str) -> Dict[str, Any]:
        """
        Evaluates whether retrieved chunks contain concrete numbers or specific policy keywords.
        """
        if not chunks:
            return {"is_sufficient": False, "score": 0.0, "reason": "No chunks retrieved."}

        top_score = max(c["similarity_score"] for c in chunks)
        combined_text = " ".join(c["chunk_text"].lower() for c in chunks)

        # Keyword / pattern checks based on aspect
        indicators = {
            "annual leave and carry forward": ["working days", "carry-forward", "carry forward", "annual leave", "cap", "7 days", "5 days", "18 working days", "20 working days"],
            "overtime compensation": ["overtime", "ordinary hourly rate", "compensatory time", "1.5 times", "1.0 times"],
            "group medical cover": ["medical cover", "family limit", "5,00,000", "3,00,000", "insurer"],
            "remote and hybrid work": ["remote-working", "hybrid", "days per week", "remote", "wfh"],
            "annual learning support": ["learning support", "25,000", "15,000", "certification", "training"],
            "partner leave": ["partner leave", "maternity", "non-birthing", "10 working days", "5 working days"]
        }

        expected = indicators.get(aspect, [w for w in aspect.split() if len(w) > 3])
        matches = [kw for kw in expected if kw in combined_text]

        # Sufficiency threshold
        if len(matches) >= 2 or (top_score > 0.65 and len(matches) >= 1):
            return {
                "is_sufficient": True,
                "score": round(top_score, 3),
                "reason": f"Sufficient information found. Matches keywords: {', '.join(matches[:3])} with similarity {top_score:.2f}."
            }
        else:
            return {
                "is_sufficient": False,
                "score": round(top_score, 3),
                "reason": f"Insufficient policy specifics. Missing required numerical caps or keywords for '{aspect}'."
            }

    def _rewrite_query(self, current_query: str, aspect: str, attempt: int) -> str:
        """
        Rewrites the query strategically to pinpoint Appendix A or key policy chapters.
        """
        if attempt == 1:
            return f"Appendix A policy schedule key figures {aspect}"
        elif attempt == 2:
            return f"Chapter {aspect} operating point rules"
        return f"{aspect} days limit schedule"

    def _build_synthesis_prompt(self, user_question: str, evidence: List[Dict[str, Any]]) -> Tuple[str, str]:
        evidence_texts = []
        for ev in evidence:
            doc_name = ev["document"]
            sq_title = ev["sub_question"]
            chunk_excerpts = []
            for c in ev.get("chunks", [])[:3]:
                chunk_excerpts.append(f"[Doc: {doc_name} | Page {c.get('page_number', 1)}]: {c.get('chunk_text', '')}")
            joined_chunks = "\n".join(chunk_excerpts)
            evidence_texts.append(f"### Sub-Question: {sq_title}\n{joined_chunks}")

        full_context = "\n\n".join(evidence_texts)
        prompt = (
            f"User Question: {user_question}\n\n"
            f"Collected Evidence from Multiple Documents:\n\n{full_context}\n\n"
            f"Please synthesize this evidence into a thorough comparison. Provide a clear table comparing the documents, "
            f"highlight specific policy changes with numbers, and conclude which policy is more favourable with citations."
        )
        return prompt, full_context

agentic_rag_service = AgenticRAGService()

