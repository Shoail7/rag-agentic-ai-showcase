export interface DocumentItem {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  char_count: number;
  chunk_count?: number;
  document_hash: string;
  processing_status: string;
  storage_location: string;
  upload_date: string;
  extracted_text_preview?: string;
  metadata_json?: string;
}

export interface ChunkItem {
  id: string;
  chunk_config_id?: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  chunk_text: string;
  token_count: number;
  similarity_score?: number;
  document_filename?: string;
}

export interface RAGPipelineResult {
  question: string;
  answer: string;
  sources: ChunkItem[];
  context_tokens: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  pipeline: {
    pdf_input: {
      documents: Array<{ id: string; filename: string; page_count: number }>;
      total_documents: number;
    };
    extraction: {
      status: string;
      method: string;
      total_pages: number;
    };
    chunking: {
      chunk_size: number;
      chunk_overlap: number;
      total_chunks_created: number;
      tokenizer: string;
    };
    embedding: {
      model: string;
      dimension: number;
      distance_metric: string;
      query_embedding_preview: (number | string)[];
      query_token_count: number;
    };
    vector_db: {
      engine: string;
      collections_queried: string[];
      top_k: number;
      similarity_threshold: number;
    };
    retrieval: {
      retrieved_count: number;
      retrieval_latency_ms: number;
      chunks: ChunkItem[];
    };
    prompt_augmentation: {
      system_prompt: string;
      user_prompt: string;
      context_tokens: number;
    };
    llm_generation: {
      provider: string;
      model: string;
      generation_latency_ms: number;
      is_simulated: boolean;
    };
  };
}

export interface AgentStep {
  step_number: number;
  thought: string;
  action_type: "THINK" | "ACT" | "OBSERVE" | "FINAL_ANSWER";
  tool_name: string;
  tool_input: any;
  tool_output: any;
  observation?: string;
  status: string;
}

export interface AgentRunResponse {
  run_id: string;
  goal: string;
  status: string;
  total_steps: number;
  execution_duration_sec: number;
  steps: AgentStep[];
  final_answer: string;
}

export interface SubQuestionItem {
  id: string;
  text: string;
  target_doc: { id: string; filename: string };
  search_query: string;
  aspect: string;
}

export interface AgenticRAGTrace {
  sub_question_id: string;
  sub_question: string;
  document: string;
  search_attempt: number;
  query: string;
  retrieved_count: number;
  retrieved_chunks: ChunkItem[];
  quality_score: number;
  is_sufficient: boolean;
  evaluation: string;
  retry_action?: string;
}

export interface AgenticRAGResponse {
  run_id: string;
  question: string;
  plan: {
    strategy: string;
    aspects_identified: string[];
    target_documents: string[];
    total_sub_queries: number;
    max_retries_allowed: number;
  };
  sub_questions: SubQuestionItem[];
  selected_documents: Array<{ id: string; filename: string }>;
  execution_trace: AgenticRAGTrace[];
  retry_count: number;
  evidence: Array<{
    sub_question: string;
    document: string;
    document_id: string;
    final_query: string;
    attempts: number;
    sufficient: boolean;
    chunks: ChunkItem[];
  }>;
  final_answer: string;
  duration_sec: number;
  provider: string;
  model: string;
}

export interface ChunkLabExperimentItem {
  id: string;
  label: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  total_chunks: number;
  retrieved_count: number;
  average_chunk_size: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  context_tokens: number;
  top_similarity_score: number;
  avg_similarity_score: number;
  generated_answer: string;
  retrieved_chunks: ChunkItem[];
  is_simulated: boolean;
}

export interface ChunkLabResponse {
  experiment_id: string;
  document_id: string;
  document_filename: string;
  question: string;
  provider: string;
  model: string;
  experiments: ChunkLabExperimentItem[];
  chart_data: Array<{
    name: string;
    label: string;
    chunk_size: number;
    total_chunks: number;
    average_tokens: number;
    context_tokens: number;
    retrieval_ms: number;
    top_similarity: number;
    avg_similarity: number;
  }>;
  slice_preview: Array<{
    label: string;
    chunk_size: number;
    overlap: number;
    slices: Array<{ index: number; text: string; word_count: number }>;
  }>;
  educational_analysis: {
    overview: string;
    small_chunks: { size: string; characteristics: string[] };
    medium_chunks: { size: string; characteristics: string[] };
    large_chunks: { size: string; characteristics: string[] };
    recommendation: string;
  };
}

export interface AppSettings {
  active_provider: string;
  providers: {
    [key: string]: {
      name: string;
      model: string;
      has_key: boolean;
      key_preview: string;
      available_models: string[];
      base_url?: string;
    };
  };
  embedding: {
    model_name: string;
    dimension: number;
    max_sequence_length: number;
    device: string;
    tokenizer: string;
  };
  storage: {
    type: string;
    local_uploads_dir: string;
    chroma_dir: string;
  };
}

export interface ModelLimitItem {
  id: string;
  name: string;
  provider: string;
  provider_name: string;
  tier: string;
  is_active: boolean;
  has_key: boolean;
  limits: {
    rpm: number | string;
    tpm: number | string;
    rpd: number | string;
    context_window: number;
    max_output_tokens: number;
  };
  reset_schedule: {
    minute_reset: string;
    daily_reset: string;
    seconds_to_daily_reset: number;
  };
  recommended_for: string;
  rate_limit_mitigation: string;
}

export interface ModelLimitsResponse {
  server_time_utc?: string;
  active_provider?: string;
  reset_cadence?: {
    rolling_minute_window_seconds: number;
    groq_daily_reset_utc: string;
    groq_seconds_until_reset: number;
    gemini_daily_reset_utc: string;
    gemini_seconds_until_reset: number;
  };
  reset_reference?: {
    minute_window: string;
    groq_daily_reset_utc: string;
    groq_seconds_until_reset: number;
    gemini_daily_reset_pt: string;
    gemini_seconds_until_reset: number;
  };
  models: ModelLimitItem[];
}


