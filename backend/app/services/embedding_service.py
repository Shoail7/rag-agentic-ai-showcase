import os
import re
import time
import json
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
try:
    import faiss
    HAS_FAISS = True
except ImportError:
    faiss = None
    HAS_FAISS = False
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.app.core.config import settings

class EmbeddingService:
    _instance = None
    _model = None
    _tokenizer = None
    _chroma_client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    def get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            # Load model locally
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return self._model

    def get_tokenizer(self):
        if self._tokenizer is None:
            # 1. Fast Rust tokenizer from cached snapshot if available
            try:
                from tokenizers import Tokenizer
                snap_dir = Path.home() / ".cache" / "huggingface" / "hub" / "models--BAAI--bge-small-en-v1.5" / "snapshots"
                tok_files = list(snap_dir.glob("*/tokenizer.json"))
                if tok_files:
                    raw_tok = Tokenizer.from_file(str(tok_files[0]))
                    class FastBGETokenizer:
                        def encode(self, text: str, add_special_tokens: bool = False):
                            enc = raw_tok.encode(text, add_special_tokens=add_special_tokens)
                            return enc.ids
                        def decode(self, token_ids: list, skip_special_tokens: bool = True):
                            return raw_tok.decode(token_ids, skip_special_tokens=skip_special_tokens)
                    self._tokenizer = FastBGETokenizer()
                    return self._tokenizer
            except Exception:
                pass

            # 2. Standard AutoTokenizer
            try:
                from transformers import AutoTokenizer
                self._tokenizer = AutoTokenizer.from_pretrained(settings.EMBEDDING_MODEL_NAME, local_files_only=True)
            except Exception:
                try:
                    from transformers import AutoTokenizer
                    self._tokenizer = AutoTokenizer.from_pretrained(settings.EMBEDDING_MODEL_NAME)
                except Exception:
                    class FastTokenizer:
                        def encode(self, text: str, add_special_tokens: bool = False):
                            import re
                            return re.findall(r"\w+|[^\w\s]", text)
                    self._tokenizer = FastTokenizer()
        return self._tokenizer

    def get_chroma_client(self):
        if self._chroma_client is None:
            settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
            self._chroma_client = chromadb.PersistentClient(
                path=str(settings.CHROMA_DIR)
            )
        return self._chroma_client

    def count_tokens(self, text: str) -> int:
        tokenizer = self.get_tokenizer()
        tokens = tokenizer.encode(text, add_special_tokens=False)
        return len(tokens)

    def chunk_document(
        self,
        pages: List[Dict[str, Any]],
        chunk_size: int = 256,
        chunk_overlap: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Token-aware chunking respecting the BAAI/bge-small-en-v1.5 tokenizer
        and maximum sequence length of 512 tokens.
        """
        if chunk_size > settings.MAX_SEQUENCE_LENGTH:
            raise ValueError(
                f"Chunk size ({chunk_size}) cannot exceed the embedding model's maximum sequence length "
                f"({settings.MAX_SEQUENCE_LENGTH} tokens). Silently truncating text is prevented."
            )
        if chunk_overlap >= chunk_size:
            raise ValueError(f"Chunk overlap ({chunk_overlap}) must be strictly less than chunk size ({chunk_size}).")
        if chunk_size < 32:
            raise ValueError("Chunk size must be at least 32 tokens.")
        if chunk_overlap < 0:
            raise ValueError("Chunk overlap cannot be negative.")

        tokenizer = self.get_tokenizer()
        chunks: List[Dict[str, Any]] = []
        chunk_index = 0

        for page in pages:
            page_num = page["page_number"]
            page_text = page["text"].strip()
            if not page_text:
                continue

            # Tokenize the entire page text into token IDs
            token_ids = tokenizer.encode(page_text, add_special_tokens=False)
            total_page_tokens = len(token_ids)

            if total_page_tokens == 0:
                continue

            # Slide window over tokens
            step = max(1, chunk_size - chunk_overlap)
            start_idx = 0

            while start_idx < total_page_tokens:
                end_idx = min(start_idx + chunk_size, total_page_tokens)
                chunk_tokens = token_ids[start_idx:end_idx]
                chunk_text = tokenizer.decode(chunk_tokens, skip_special_tokens=True).strip()

                if chunk_text:
                    chunks.append({
                        "id": f"chunk_{uuid.uuid4().hex[:10]}",
                        "chunk_index": chunk_index,
                        "page_number": page_num,
                        "chunk_text": chunk_text,
                        "token_count": len(chunk_tokens)
                    })
                    chunk_index += 1

                if end_idx >= total_page_tokens:
                    break
                start_idx += step

        return chunks

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        model = self.get_model()
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        model = self.get_model()
        embedding = model.encode([query], normalize_embeddings=True, show_progress_bar=False)[0]
        return embedding.tolist()

    def get_or_create_collection(
        self,
        document_hash: str,
        chunk_size: int,
        chunk_overlap: int,
        chunks: Optional[List[Dict[str, Any]]] = None,
        document_id: str = "",
        document_filename: str = ""
    ) -> Tuple[Any, str, bool]:
        """
        Creates or retrieves ChromaDB collection for the given parameters.
        Returns (collection, collection_name, is_newly_indexed)
        """
        client = self.get_chroma_client()
        # Clean collection name safe for ChromaDB
        safe_hash = document_hash[:12].lower()
        collection_name = f"doc_{safe_hash}_s{chunk_size}_o{chunk_overlap}"
        
        try:
            # Check if collection already exists with data
            existing = client.get_collection(name=collection_name)
            if existing.count() > 0:
                return existing, collection_name, False
        except Exception:
            pass

        # Create or recreate collection
        try:
            client.delete_collection(name=collection_name)
        except Exception:
            pass

        collection = client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

        if chunks:
            ids = [c["id"] for c in chunks]
            texts = [c["chunk_text"] for c in chunks]
            metadatas = [
                {
                    "chunk_index": c["chunk_index"],
                    "page_number": c["page_number"],
                    "token_count": c["token_count"],
                    "document_id": document_id,
                    "document_filename": document_filename
                }
                for c in chunks
            ]
            embeddings = self.embed_texts(texts)
            
            # Batch add to Chroma
            batch_size = 200
            for i in range(0, len(ids), batch_size):
                end_i = min(i + batch_size, len(ids))
                collection.add(
                    ids=ids[i:end_i],
                    documents=texts[i:end_i],
                    embeddings=embeddings[i:end_i],
                    metadatas=metadatas[i:end_i]
                )

            # Synchronize with persistent FAISS index
            self.build_faiss_index(
                collection_name=collection_name,
                chunks=chunks,
                embeddings=embeddings,
                document_id=document_id,
                document_filename=document_filename
            )

        return collection, collection_name, True

    def build_faiss_index(
        self,
        collection_name: str,
        chunks: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None,
        document_id: str = "",
        document_filename: str = ""
    ) -> bool:
        """Creates and persists a FAISS IndexFlatIP (cosine similarity) index."""
        if not HAS_FAISS or not chunks:
            return False

        try:
            settings.FAISS_DIR.mkdir(parents=True, exist_ok=True)
            index_path = settings.FAISS_DIR / f"{collection_name}.faiss"
            meta_path = settings.FAISS_DIR / f"{collection_name}.json"

            texts = [c["chunk_text"] for c in chunks]
            if embeddings is None:
                embeddings = self.embed_texts(texts)

            emb_arr = np.array(embeddings, dtype="float32")
            # Normalize vectors for cosine similarity (Inner Product space)
            norms = np.linalg.norm(emb_arr, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            emb_arr = emb_arr / norms

            dim = emb_arr.shape[1]
            index = faiss.IndexFlatIP(dim)
            index.add(emb_arr)

            faiss.write_index(index, str(index_path))

            meta_data = [
                {
                    "chunk_id": c["id"],
                    "chunk_text": c["chunk_text"],
                    "chunk_index": c["chunk_index"],
                    "page_number": c["page_number"],
                    "token_count": c["token_count"],
                    "document_id": document_id,
                    "document_filename": document_filename
                }
                for c in chunks
            ]
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta_data, f, ensure_ascii=False)

            return True
        except Exception as e:
            print(f"[FAISS Indexing Error]: {e}")
            return False

    def query_faiss(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.0
    ) -> Tuple[List[Dict[str, Any]], float, List[float]]:
        """Queries persistent FAISS index for top-k matching chunks."""
        index_path = settings.FAISS_DIR / f"{collection_name}.faiss"
        meta_path = settings.FAISS_DIR / f"{collection_name}.json"

        if not HAS_FAISS or not index_path.exists() or not meta_path.exists():
            return [], 0.0, []

        start_t = time.perf_counter()
        query_emb = self.embed_query(query)
        q_arr = np.array([query_emb], dtype="float32")
        q_norm = np.linalg.norm(q_arr)
        if q_norm > 0:
            q_arr = q_arr / q_norm

        index = faiss.read_index(str(index_path))
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        actual_k = min(top_k, index.ntotal)
        if actual_k <= 0:
            return [], (time.perf_counter() - start_t) * 1000.0, query_emb

        distances, indices = index.search(q_arr, actual_k)
        latency_ms = (time.perf_counter() - start_t) * 1000.0

        retrieved = []
        for i, idx in enumerate(indices[0]):
            if idx < 0 or idx >= len(metadata):
                continue
            sim = round(float(distances[0][i]), 4)
            if sim >= similarity_threshold:
                item = metadata[idx]
                retrieved.append({
                    "chunk_id": item["chunk_id"],
                    "chunk_text": item["chunk_text"],
                    "page_number": item.get("page_number", 1),
                    "chunk_index": item.get("chunk_index", 0),
                    "token_count": item.get("token_count", self.count_tokens(item["chunk_text"])),
                    "similarity_score": sim,
                    "document_id": item.get("document_id", ""),
                    "document_filename": item.get("document_filename", "")
                })

        return retrieved, latency_ms, query_emb

    def query_collection(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.0
    ) -> Tuple[List[Dict[str, Any]], float, List[float]]:
        """
        Retrieves top-k relevant chunks from collection.
        Supports both FAISS and ChromaDB vector retrieval seamlessly.
        Returns: (results, latency_ms, query_embedding)
        """
        # If FAISS is configured or index exists, query via FAISS
        faiss_idx = settings.FAISS_DIR / f"{collection_name}.faiss"
        if getattr(settings, "VECTOR_DB", "faiss") == "faiss" and faiss_idx.exists():
            faiss_res, f_lat, f_qemb = self.query_faiss(collection_name, query, top_k, similarity_threshold)
            if faiss_res:
                return faiss_res, f_lat, f_qemb

        # Fallback or standard ChromaDB retrieval
        try:
            client = self.get_chroma_client()
            collection = client.get_collection(name=collection_name)
            
            start_t = time.perf_counter()
            query_emb = self.embed_query(query)
            res = collection.query(
                query_embeddings=[query_emb],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            latency_ms = (time.perf_counter() - start_t) * 1000.0

            retrieved: List[Dict[str, Any]] = []
            if res and res["ids"] and len(res["ids"][0]) > 0:
                ids = res["ids"][0]
                docs = res["documents"][0]
                metas = res["metadatas"][0]
                distances = res["distances"][0]

                for i in range(len(ids)):
                    dist = distances[i]
                    similarity = round(max(0.0, min(1.0, 1.0 - dist)), 4)
                    if similarity >= similarity_threshold:
                        meta = metas[i]
                        retrieved.append({
                            "chunk_id": ids[i],
                            "chunk_text": docs[i],
                            "page_number": meta.get("page_number", 1),
                            "chunk_index": meta.get("chunk_index", 0),
                            "token_count": meta.get("token_count", self.count_tokens(docs[i])),
                            "similarity_score": similarity,
                            "document_id": meta.get("document_id", ""),
                            "document_filename": meta.get("document_filename", "")
                        })

            return retrieved, latency_ms, query_emb
        except Exception as e:
            # If Chroma fails, fallback to FAISS
            return self.query_faiss(collection_name, query, top_k, similarity_threshold)

    def delete_collections_for_doc(self, document_hash: str):
        """Removes all ChromaDB collections and FAISS index files associated with a document hash."""
        safe_hash = document_hash[:12].lower()
        # Clean ChromaDB
        try:
            client = self.get_chroma_client()
            cols = client.list_collections()
            for col in cols:
                col_name = col.name if hasattr(col, 'name') else str(col)
                if safe_hash in col_name:
                    try:
                        client.delete_collection(name=col_name)
                    except Exception:
                        pass
        except Exception:
            pass

        # Clean FAISS files
        try:
            if settings.FAISS_DIR.exists():
                for p in settings.FAISS_DIR.glob(f"*{safe_hash}*"):
                    try:
                        p.unlink(missing_ok=True)
                    except Exception:
                        pass
        except Exception:
            pass

embedding_service = EmbeddingService()

