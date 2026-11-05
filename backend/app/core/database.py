import sqlite3
import json
from contextlib import contextmanager
from typing import Generator
from backend.app.core.config import settings

def init_db():
    settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Enable WAL mode for better concurrency
    cursor.execute("PRAGMA journal_mode=WAL;")
    
    # 1. Documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        char_count INTEGER DEFAULT 0,
        document_hash TEXT NOT NULL UNIQUE,
        processing_status TEXT NOT NULL,
        storage_location TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        extracted_text_preview TEXT,
        metadata_json TEXT
    );
    """)
    
    # 2. Document Pages table (to store per-page text for high-fidelity retrieval & preview)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        page_text TEXT NOT NULL,
        char_count INTEGER NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    """)
    
    # 3. Chunk Configurations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chunk_configs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        chunk_size INTEGER NOT NULL,
        chunk_overlap INTEGER NOT NULL,
        embedding_model TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        total_chunks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    """)
    
    # 4. Chunks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        chunk_config_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        FOREIGN KEY (chunk_config_id) REFERENCES chunk_configs(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    """)
    
    # 5. Experiments (for Chunk Size Laboratory)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        question TEXT NOT NULL,
        llm_provider TEXT NOT NULL,
        llm_model TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    """)
    
    # 6. Experiment Results
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiment_results (
        id TEXT PRIMARY KEY,
        experiment_id TEXT NOT NULL,
        chunk_config_id TEXT NOT NULL,
        chunk_size INTEGER NOT NULL,
        chunk_overlap INTEGER NOT NULL,
        top_k INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        average_chunk_size REAL NOT NULL,
        retrieval_latency_ms REAL NOT NULL,
        generation_latency_ms REAL NOT NULL,
        context_tokens INTEGER NOT NULL,
        generated_answer TEXT NOT NULL,
        retrieved_chunks_json TEXT NOT NULL,
        metrics_json TEXT,
        FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
    );
    """)
    
    # 7. Agent Runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_runs (
        id TEXT PRIMARY KEY,
        user_question TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL,
        total_steps INTEGER DEFAULT 0,
        execution_duration_sec REAL DEFAULT 0.0,
        final_answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    );
    """)
    
    # 8. Agent Steps
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_run_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        thought TEXT,
        action_type TEXT NOT NULL,
        tool_name TEXT,
        tool_input TEXT,
        tool_output TEXT,
        observation TEXT,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );
    """)
    
    # 9. Agentic RAG Runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agentic_rag_runs (
        id TEXT PRIMARY KEY,
        user_question TEXT NOT NULL,
        document_ids_json TEXT NOT NULL,
        plan_json TEXT,
        sub_questions_json TEXT,
        evidence_json TEXT,
        retry_count INTEGER DEFAULT 0,
        final_answer TEXT,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    );
    """)
    
    # 10. System Settings (stored persistent key-value configuration)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    conn.commit()
    conn.close()

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.DATABASE_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

