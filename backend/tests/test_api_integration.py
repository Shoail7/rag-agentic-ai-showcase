import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.database import init_db

def test_full_api_workflow():
    async def _run():
        init_db()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Health check
            h_res = await client.get("/api/settings/health")
            assert h_res.status_code == 200
            assert h_res.json()["status"] == "healthy"

            # 2. Documents
            doc_res = await client.get("/api/documents")
            assert doc_res.status_code == 200
            docs = doc_res.json()
            assert len(docs) >= 2

            doc_2025 = next(d for d in docs if "2025" in d["original_filename"])

            # 3. RAG Query
            rag_res = await client.post("/api/rag/query", json={
                "document_ids": [doc_2025["id"]],
                "question": "How many annual leaves can an employee carry forward?",
                "chunk_size": 256,
                "chunk_overlap": 30,
                "top_k": 3,
                "similarity_threshold": 0.0
            })
            assert rag_res.status_code == 200
            rag_data = rag_res.json()
            assert len(rag_data["sources"]) > 0

            # 4. Agent Run
            agent_res = await client.post("/api/agent/run", json={
                "goal": "Plan a two-day Goa trip under 10000"
            })
            assert agent_res.status_code == 200
            agent_data = agent_res.json()
            assert agent_data["total_steps"] >= 5
            assert agent_data["status"] == "completed"

            # 5. Agentic RAG
            arag_res = await client.post("/api/agentic-rag/query", json={
                "question": "Compare annual leave between 2024 and 2025",
                "max_retries": 2
            })
            assert arag_res.status_code == 200
            arag_data = arag_res.json()
            assert len(arag_data["sub_questions"]) >= 2

            # 6. Chunk Size Laboratory
            lab_res = await client.post("/api/chunk-lab/compare", json={
                "document_id": doc_2025["id"],
                "question": "How many annual leaves can an employee carry forward?",
                "config_a": {"chunk_size": 128, "chunk_overlap": 20, "top_k": 3},
                "config_b": {"chunk_size": 256, "chunk_overlap": 30, "top_k": 3},
                "config_c": {"chunk_size": 400, "chunk_overlap": 50, "top_k": 3}
            })
            assert lab_res.status_code == 200
            lab_data = lab_res.json()
            assert len(lab_data["experiments"]) == 3
            # Smaller chunk size should yield more total chunks
            assert lab_data["experiments"][0]["total_chunks"] > lab_data["experiments"][2]["total_chunks"]

    asyncio.run(_run())
