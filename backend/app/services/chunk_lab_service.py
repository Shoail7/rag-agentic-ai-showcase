import time
import json
import uuid
from typing import Dict, Any, List, Optional
from backend.app.core.database import get_db
from backend.app.services.embedding_service import embedding_service
from backend.app.services.rag_service import rag_service
from backend.app.services.llm_service import llm_service

class ChunkLabService:
    async def run_comparison_experiment(
        self,
        document_id: str,
        question: str,
        config_a: Dict[str, Any],
        config_b: Dict[str, Any],
        config_c: Dict[str, Any],
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs the exact same question and PDF through 3 distinct chunk configurations
        with identical embedding model, LLM, and prompt template.
        """
        # Validate configurations
        for name, cfg in [("A", config_a), ("B", config_b), ("C", config_c)]:
            cs = int(cfg.get("chunk_size", 256))
            co = int(cfg.get("chunk_overlap", 30))
            if co >= cs:
                raise ValueError(f"Config {name}: Chunk overlap ({co}) must be less than chunk size ({cs}).")
            if cs > 512:
                raise ValueError(f"Config {name}: Chunk size ({cs}) exceeds embedding model maximum (512 tokens).")
            if cs < 32:
                raise ValueError(f"Config {name}: Chunk size ({cs}) must be at least 32 tokens.")

        with get_db() as db:
            doc = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
            if not doc:
                raise ValueError(f"Document {document_id} not found.")

        experiment_id = f"exp_{uuid.uuid4().hex[:10]}"
        active_provider = provider or llm_service.get_active_provider()
        active_model = model or llm_service.get_model_for_provider(active_provider)

        with get_db() as db:
            db.execute(
                "INSERT INTO experiments (id, document_id, question, llm_provider, llm_model) VALUES (?, ?, ?, ?, ?)",
                (experiment_id, document_id, question, active_provider, active_model)
            )
            db.commit()

        configs = [
            ("Experiment A", config_a),
            ("Experiment B", config_b),
            ("Experiment C", config_c)
        ]

        results = []
        chart_data = []

        for exp_label, cfg in configs:
            c_size = int(cfg.get("chunk_size", 256))
            c_overlap = int(cfg.get("chunk_overlap", 30))
            top_k = int(cfg.get("top_k", 5))

            # 1. Process document chunking & indexing (or use cached Chroma index)
            proc = await rag_service.process_document_indexing(
                document_id=document_id,
                chunk_size=c_size,
                chunk_overlap=c_overlap
            )

            # 2. Vector retrieval
            retrieved, ret_latency, _ = embedding_service.query_collection(
                collection_name=proc["collection_name"],
                query=question,
                top_k=top_k,
                similarity_threshold=0.0
            )

            # 3. Calculate actual metrics
            total_chunks = proc["total_chunks"]
            with get_db() as db:
                avg_row = db.execute(
                    "SELECT AVG(token_count) as avg_tokens FROM chunks WHERE chunk_config_id = ?",
                    (proc["config_id"],)
                ).fetchone()
                avg_chunk_tokens = round(avg_row["avg_tokens"] if avg_row and avg_row["avg_tokens"] else c_size, 1)

            context_tokens = sum(c.get("token_count", 0) for c in retrieved)
            avg_score = round(sum(c["similarity_score"] for c in retrieved) / len(retrieved), 4) if retrieved else 0.0
            top_score = round(max((c["similarity_score"] for c in retrieved), default=0.0), 4)

            # 4. Prompt Augmentation
            context_text = "\n\n".join(
                f"[Chunk {c['chunk_id']} | Page {c['page_number']} | Sim: {c['similarity_score']}]: {c['chunk_text']}"
                for c in retrieved
            )
            system_prompt = (
                "You are an educational AI assistant analyzing chunk size trade-offs.\n"
                "Answer the question using ONLY the provided context excerpts.\n"
                "Cite exact page numbers and chunk text. If not present in context, state so explicitly."
            )
            user_prompt = f"Context:\n{context_text}\n\nQuestion: {question}"

            # 5. LLM Answer Generation
            gen_res = await llm_service.generate_response(
                prompt=user_prompt,
                system_prompt=system_prompt,
                provider=active_provider,
                model=active_model
            )

            res_id = f"res_{uuid.uuid4().hex[:10]}"
            result_item = {
                "id": res_id,
                "label": exp_label,
                "chunk_size": c_size,
                "chunk_overlap": c_overlap,
                "top_k": top_k,
                "total_chunks": total_chunks,
                "retrieved_count": len(retrieved),
                "average_chunk_size": avg_chunk_tokens,
                "retrieval_latency_ms": round(ret_latency, 2),
                "generation_latency_ms": gen_res["latency_ms"],
                "context_tokens": context_tokens,
                "top_similarity_score": top_score,
                "avg_similarity_score": avg_score,
                "generated_answer": gen_res["answer"],
                "retrieved_chunks": retrieved,
                "is_simulated": gen_res.get("is_simulated", False)
            }
            results.append(result_item)

            chart_data.append({
                "name": f"{c_size} tokens",
                "label": exp_label,
                "chunk_size": c_size,
                "total_chunks": total_chunks,
                "average_tokens": avg_chunk_tokens,
                "context_tokens": context_tokens,
                "retrieval_ms": round(ret_latency, 2),
                "top_similarity": top_score,
                "avg_similarity": avg_score
            })

            # Record in DB
            with get_db() as db:
                db.execute(
                    "INSERT INTO experiment_results (id, experiment_id, chunk_config_id, chunk_size, chunk_overlap, top_k, total_chunks, average_chunk_size, retrieval_latency_ms, generation_latency_ms, context_tokens, generated_answer, retrieved_chunks_json, metrics_json) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        res_id,
                        experiment_id,
                        proc["config_id"],
                        c_size,
                        c_overlap,
                        top_k,
                        total_chunks,
                        avg_chunk_tokens,
                        round(ret_latency, 2),
                        gen_res["latency_ms"],
                        context_tokens,
                        gen_res["answer"],
                        json.dumps(retrieved),
                        json.dumps(chart_data[-1])
                    )
                )
                db.commit()

        # Generate Educational Analysis of the Trade-offs
        tradeoff_analysis = self._generate_educational_explanation(question, results)

        # Slice Visualization Data (sample of first 1000 characters sliced across configs)
        slice_preview = self._generate_slice_preview(document_id, configs)

        return {
            "experiment_id": experiment_id,
            "document_id": document_id,
            "document_filename": doc["original_filename"],
            "question": question,
            "provider": active_provider,
            "model": active_model,
            "experiments": results,
            "chart_data": chart_data,
            "slice_preview": slice_preview,
            "educational_analysis": tradeoff_analysis
        }

    def _generate_educational_explanation(self, question: str, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        exp_a, exp_b, exp_c = results[0], results[1], results[2]
        return {
            "overview": (
                "Chunk size fundamentally governs the trade-off between **retrieval precision** and **semantic context**.\n"
                "There is no universally optimal chunk size; the optimal configuration depends on document density, formatting, query specificity, and LLM context window."
            ),
            "small_chunks": {
                "size": f"{exp_a['chunk_size']} tokens",
                "characteristics": [
                    f"Generated {exp_a['total_chunks']} fine-grained chunks.",
                    "Highest granularity: pinpoint matches for short, isolated keywords and numerical figures.",
                    f"Used {exp_a['context_tokens']} total context tokens.",
                    "Trade-off Risk: Multi-sentence clauses, caveats, and preceding condition lines may be split across chunk boundaries, potentially missing contextual nuances."
                ]
            },
            "medium_chunks": {
                "size": f"{exp_b['chunk_size']} tokens",
                "characteristics": [
                    f"Generated {exp_b['total_chunks']} balanced chunks.",
                    "Standard industrial baseline: preserves paragraph-level thoughts and complete policy definitions.",
                    f"Used {exp_b['context_tokens']} total context tokens.",
                    "Trade-off Balance: Often achieves good semantic overlap with natural language questions without overwhelming the LLM prompt."
                ]
            },
            "large_chunks": {
                "size": f"{exp_c['chunk_size']} tokens",
                "characteristics": [
                    f"Generated {exp_c['total_chunks']} broad chunks.",
                    "Maximum surrounding context preserved: captures entire sections, adjacent bullet points, and exceptions.",
                    f"Used {exp_c['context_tokens']} total context tokens (highest prompt footprint).",
                    "Trade-off Risk: Lower semantic density; irrelevant sentences dilute vector similarity, and extra non-pertinent tokens consume LLM attention."
                ]
            },
            "recommendation": (
                "For quick factual lookup of caps (e.g., 'how many days'), small to medium chunks often score high precision. "
                "For thematic analysis, procedural steps, or nuanced caveats, medium to large chunks prevent loss of crucial antecedent clauses."
            )
        }

    def _generate_slice_preview(self, document_id: str, configs: List[Any]) -> List[Dict[str, Any]]:
        """
        Creates a visual comparison of how page 1 text is split across the 3 chunk configs.
        """
        with get_db() as db:
            p1 = db.execute(
                "SELECT page_text FROM document_pages WHERE document_id = ? AND page_number = 1",
                (document_id,)
            ).fetchone()
            sample_text = p1["page_text"][:600] if p1 else "Nexora Technologies Employee Handbook..."

        slices = []
        for label, cfg in configs:
            cs = int(cfg.get("chunk_size", 256))
            co = int(cfg.get("chunk_overlap", 30))
            words = sample_text.split()
            # Estimate word count roughly ~ tokens * 0.75
            chunk_word_size = max(10, int(cs * 0.75))
            overlap_words = max(2, int(co * 0.75))
            step = max(5, chunk_word_size - overlap_words)

            chunks_demo = []
            for i in range(0, min(len(words), 80), step):
                chunk_slice = " ".join(words[i:i + chunk_word_size])
                if chunk_slice:
                    chunks_demo.append({
                        "index": len(chunks_demo) + 1,
                        "text": chunk_slice,
                        "word_count": len(chunk_slice.split())
                    })
            slices.append({
                "label": label,
                "chunk_size": cs,
                "overlap": co,
                "slices": chunks_demo[:4]
            })
        return slices

chunk_lab_service = ChunkLabService()

