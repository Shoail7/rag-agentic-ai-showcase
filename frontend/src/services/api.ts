import {
  DocumentItem,
  RAGPipelineResult,
  AgentRunResponse,
  AgenticRAGResponse,
  ChunkLabResponse,
  AppSettings,
  ModelLimitsResponse
} from '../types';

// Determine API base URL dynamically:
// Prefers VITE_API_BASE_URL when deployed, falls back to '/api' for local proxy
const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
export const API_BASE = envBase ? (envBase.endsWith('/api') ? envBase : `${envBase}/api`) : '/api';

export const api = {
  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocuments(files: File[]): Promise<{ uploaded: any[] }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async loadSampleDocuments(): Promise<{ results: any[] }> {
    const res = await fetch(`${API_BASE}/documents/load-samples`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to load sample documents');
    return res.json();
  },

  async getDocument(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  async getPageText(docId: string, page: number): Promise<{ page_number: number; page_text: string; char_count: number }> {
    const res = await fetch(`${API_BASE}/documents/${docId}/pages/${page}`);
    if (!res.ok) throw new Error('Failed to fetch page text');
    return res.json();
  },

  getPreviewUrl(docId: string, page: number = 1): string {
    return `${API_BASE}/documents/${docId}/preview?page=${page}`;
  },

  getDownloadUrl(docId: string): string {
    return `${API_BASE}/documents/${docId}/download`;
  },

  // RAG Explorer
  async queryRAG(params: {
    document_ids: string[];
    question: string;
    chunk_size: number;
    chunk_overlap: number;
    top_k: number;
    similarity_threshold: number;
    provider?: string;
    model?: string;
  }): Promise<RAGPipelineResult> {
    const res = await fetch(`${API_BASE}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'RAG query failed' }));
      throw new Error(err.detail || 'RAG query failed');
    }
    return res.json();
  },

  async getDocumentChunks(docId: string, chunkSize?: number): Promise<any[]> {
    const url = chunkSize 
      ? `${API_BASE}/rag/chunks/${docId}?chunk_size=${chunkSize}`
      : `${API_BASE}/rag/chunks/${docId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chunks');
    return res.json();
  },

  // AI Agent Studio
  async runAgent(goal: string): Promise<AgentRunResponse> {
    const res = await fetch(`${API_BASE}/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Agent execution failed' }));
      throw new Error(err.detail || 'Agent execution failed');
    }
    return res.json();
  },

  async getAgentTools(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/agent/tools`);
    if (!res.ok) throw new Error('Failed to fetch tools');
    return res.json();
  },

  async testCalculator(expression: string): Promise<any> {
    const res = await fetch(`${API_BASE}/agent/tools/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression }),
    });
    return res.json();
  },

  async testDateCalculator(params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/agent/tools/date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async testTravelSearch(params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/agent/tools/travel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async testDataAnalysis(params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/agent/tools/data-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // Agentic RAG Studio
  async queryAgenticRAG(params: {
    question: string;
    document_ids?: string[];
    max_retries?: number;
    chunk_size?: number;
    chunk_overlap?: number;
    provider?: string;
    model?: string;
  }): Promise<AgenticRAGResponse> {
    const res = await fetch(`${API_BASE}/agentic-rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Agentic RAG query failed' }));
      throw new Error(err.detail || 'Agentic RAG query failed');
    }
    return res.json();
  },

  // Chunk Size Laboratory
  async compareChunkSizes(params: {
    document_id: string;
    question: string;
    config_a: { chunk_size: number; chunk_overlap: number; top_k: number };
    config_b: { chunk_size: number; chunk_overlap: number; top_k: number };
    config_c: { chunk_size: number; chunk_overlap: number; top_k: number };
    provider?: string;
    model?: string;
  }): Promise<ChunkLabResponse> {
    const res = await fetch(`${API_BASE}/chunk-lab/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chunk comparison failed' }));
      throw new Error(err.detail || 'Chunk comparison failed');
    }
    return res.json();
  },

  // Settings & System Health
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async getModelLimits(): Promise<ModelLimitsResponse> {
    const res = await fetch(`${API_BASE}/settings/limits`);
    if (!res.ok) throw new Error('Failed to fetch model limits');
    return res.json();
  },

  async updateProvider(params: {
    provider: string;
    gemini_model?: string;
    groq_model?: string;
    ollama_model?: string;
    ollama_url?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to update provider');
    return res.json();
  },

  async updateApiKeys(keys: {
    gemini_api_key?: string;
    groq_api_key?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keys),
    });
    if (!res.ok) throw new Error('Failed to save API keys');
    return res.json();
  },

  async getHealth(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }
};

