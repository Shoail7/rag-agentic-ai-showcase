import React, { useState, useEffect } from 'react';
import {
  Search,
  Layers,
  Cpu,
  Database,
  ArrowRight,
  FileText,
  Sliders,
  CheckCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Header } from '../components/Header';
import { LearnHowItWorks } from '../components/LearnHowItWorks';
import { api } from '../services/api';
import { DocumentItem, RAGPipelineResult } from '../types';

export const RagExplorer: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [chunkSize, setChunkSize] = useState<number>(256);
  const [chunkOverlap, setChunkOverlap] = useState<number>(30);
  const [topK, setTopK] = useState<number>(5);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.0);
  const [question, setQuestion] = useState<string>('What is the standard employee probation period in the 2025 handbook?');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RAGPipelineResult | null>(null);
  const [activeStage, setActiveStage] = useState<string>('answer');
  const [inspectedChunks, setInspectedChunks] = useState<any[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  useEffect(() => {
    api.getDocuments().then((docs) => {
      setDocuments(docs);
      if (docs.length > 0 && selectedDocIds.length === 0) {
        const defaultDoc = docs.find(d => d.original_filename.includes('2025')) || docs[0];
        setSelectedDocIds([defaultDoc.id]);
      }
    }).catch(console.error);
  }, []);

  const handleToggleDoc = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      if (selectedDocIds.length > 1) {
        setSelectedDocIds(selectedDocIds.filter(id => id !== docId));
      }
    } else {
      setSelectedDocIds([...selectedDocIds, docId]);
    }
  };

  const handleRunRAG = async () => {
    if (selectedDocIds.length === 0) {
      alert('Please select at least one document from the PDF library.');
      return;
    }
    if (!question.trim()) {
      alert('Please enter a question.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.queryRAG({
        document_ids: selectedDocIds,
        question,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        top_k: topK,
        similarity_threshold: similarityThreshold
      });
      setResult(res);
      setActiveStage('answer');
    } catch (e: any) {
      alert(`RAG Query failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectChunks = async () => {
    if (selectedDocIds.length === 0) return;
    setActiveStage('chunking');
    try {
      setLoadingChunks(true);
      const chunks = await api.getDocumentChunks(selectedDocIds[0], chunkSize);
      setInspectedChunks(chunks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChunks(false);
    }
  };

  const pipelineStages = [
    { id: 'pdf_input', label: 'PDF Input', icon: FileText },
    { id: 'extraction', label: 'Extraction', icon: Layers },
    { id: 'chunking', label: 'Chunking', icon: Sliders },
    { id: 'embedding', label: 'Embeddings', icon: Sparkles },
    { id: 'vector_db', label: 'Vector DB', icon: Database },
    { id: 'retrieval', label: 'Retrieval', icon: Search },
    { id: 'prompt_augmentation', label: 'Prompt Context', icon: HelpCircle },
    { id: 'answer', label: 'LLM Answer', icon: Cpu },
  ];

  const presetQuestions = [
    "What is the standard employee probation period in the 2025 handbook?",
    "How many annual leave days are provided per completed leave year in 2025?",
    "What is the carry-forward limit for unused annual leave in 2025?",
    "What is the approved overtime compensation rate in 2025?",
    "What is the base annual family limit for Group Medical Cover in 2025?"
  ];

  const learnItems = [
    {
      title: "1. What is Chunking?",
      summary: "Splitting long documents into semantically coherent, token-bounded units so retrieval can find specific relevant passages.",
      details: "Embedding models have strict sequence length limits (e.g. 512 tokens for BGE-small). Tokenizer-aware chunking breaks documents into segments using the model's exact vocabulary, adding overlapping tokens between chunks so concepts spanning sentence boundaries are not truncated."
    },
    {
      title: "2. What are Vector Embeddings?",
      summary: "High-dimensional numerical coordinate arrays (vectors) that capture semantic meaning rather than exact keyword matches.",
      details: "The embedding model (BAAI/bge-small-en-v1.5) transforms chunks and user questions into 384-dimensional floating point vectors. Texts with similar meanings lie geometrically close in high-dimensional vector space."
    },
    {
      title: "3. What is a Vector Database & Semantic Search?",
      summary: "ChromaDB stores embedding vectors and performs approximate nearest-neighbor (HNSW) search using Cosine distance.",
      details: "Instead of searching for exact string matches like CTRL+F, cosine similarity measures the angle between the query vector and chunk vectors. Chunks with higher cosine similarity scores (closer to 1.0) represent the most relevant context."
    },
    {
      title: "4. What is Prompt Augmentation?",
      summary: "Injecting retrieved chunk passages directly into the LLM system and user prompt before generation.",
      details: "The LLM's static training data does not know about internal company policies. Augmenting the prompt with exact retrieved chunks provides the facts necessary for the LLM to ground its response."
    },
    {
      title: "5. Hallucination Mitigation",
      summary: "Strict grounding instructions force the LLM to cite document and page sources and report insufficient data when facts are absent.",
      details: "By constraining the model to use ONLY retrieved context, RAG minimizes false information (hallucination) and provides verifiable audit citations."
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="RAG Explorer"
        subtitle="Step-by-step conventional Retrieval-Augmented Generation pipeline inspection"
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Educational banner */}
        <LearnHowItWorks moduleName="Conventional RAG Pipeline" items={learnItems} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration & Query Controls */}
          <div className="lg:col-span-4 space-y-5">
            <div className="liquid-glass rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  RAG Configuration
                </h3>
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold bg-black/5 dark:bg-white/10 px-2.5 py-0.5 rounded-full">
                  BGE-Small (384d)
                </span>
              </div>

              {/* Document Multi-Select */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2 font-display">
                  Select Documents ({selectedDocIds.length} chosen)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-2xl liquid-glass-subtle">
                  {documents.length === 0 ? (
                    <p className="text-[11px] text-slate-400 p-2 text-center">No PDFs in library. Click 'Load Sample Handbooks' above.</p>
                  ) : (
                    documents.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-white/[0.08] cursor-pointer text-xs transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.id)}
                          onChange={() => handleToggleDoc(doc.id)}
                          className="rounded text-black focus:ring-black w-3.5 h-3.5 accent-black dark:accent-white cursor-pointer"
                        />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {doc.original_filename}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Chunk Size Control */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Chunk Size (Tokens)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{chunkSize}</span>
                </div>
                <input
                  type="range"
                  min="64"
                  max="512"
                  step="32"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>64</span>
                  <span>256 (default)</span>
                  <span>512 (max)</span>
                </div>
              </div>

              {/* Chunk Overlap Control */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Chunk Overlap</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{chunkOverlap} tokens</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.min(chunkSize - 10, 100)}
                  step="10"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
              </div>

              {/* Top K Control */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Top K (Retrieved Chunks)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{topK} chunks</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 8, 10].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTopK(k)}
                      className={`py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        topK === k
                          ? 'btn-liquid-pill shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Input */}
              <div className="pt-2">
                <label className="text-xs font-bold font-display text-slate-700 dark:text-slate-300 block mb-1.5">
                  User Question
                </label>
                <textarea
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter a question about the document..."
                  className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 outline-hidden resize-none transition-all"
                />
              </div>

              {/* Preloaded Demo Questions */}
              <div>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                  Try Demo Questions
                </span>
                <div className="space-y-1">
                  {presetQuestions.map((pq, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuestion(pq)}
                      className="w-full text-left p-2 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white transition-colors truncate block cursor-pointer"
                    >
                      • {pq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Run Query Button */}
              <button
                onClick={handleRunRAG}
                disabled={loading}
                className="w-full py-3.5 btn-liquid-pill text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                    <span>Processing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run RAG Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Visual Pipeline Flow & Stage Inspector */}
          <div className="lg:col-span-8 space-y-6">
            {/* Visual Interactive Pipeline Ribbon */}
            <div className="liquid-glass rounded-3xl p-5">
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3.5">
                Interactive RAG Pipeline Stages (Click any stage to inspect)
              </span>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {pipelineStages.map((stage) => {
                  const Icon = stage.icon;
                  const isActive = activeStage === stage.id;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        if (stage.id === 'chunking') {
                          handleInspectChunks();
                        } else {
                          setActiveStage(stage.id);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-md scale-[1.02]'
                          : 'border-transparent bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1.5" />
                      <span className="text-[10px] font-semibold leading-tight line-clamp-1 font-display">
                        {stage.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Inspection View */}
            <div className="liquid-glass rounded-3xl p-7 min-h-[460px] flex flex-col justify-between">
              {/* STAGE: ANSWER (Default) */}
              {activeStage === 'answer' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
                    <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      Grounded Generated Response
                    </h4>
                    {result && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Total: {result.total_latency_ms} ms (Ret: {result.retrieval_latency_ms}ms, Gen: {result.generation_latency_ms}ms)
                      </span>
                    )}
                  </div>

                  {!result ? (
                    <div className="p-16 text-center text-slate-400">
                      <Search className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Configure your settings on the left and click "Run RAG Pipeline"
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* LLM Answer Display */}
                      <div className="p-6 rounded-3xl liquid-glass-subtle">
                        <pre className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {result.answer}
                        </pre>
                      </div>

                      {/* Source Citations */}
                      <div>
                        <h5 className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                          Retrieved Source Citations ({result.sources.length} chunks)
                        </h5>
                        <div className="space-y-3">
                          {result.sources.map((s, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl liquid-glass-subtle text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white font-display">
                                  Source #{idx + 1} • {s.document_filename} (Page {s.page_number})
                                </span>
                                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                  Sim: {(s.similarity_score! * 100).toFixed(1)}%
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                                "{s.chunk_text}"
                              </p>
                              <div className="text-[10px] font-mono text-slate-400">
                                Chunk ID: {s.id} • Tokens: {s.token_count}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE: CHUNKING */}
              {activeStage === 'chunking' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                    <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Actual Token-Bounded Chunks
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Config: {chunkSize} tokens (Overlap: {chunkOverlap})
                    </span>
                  </div>

                  {loadingChunks ? (
                    <div className="p-12 text-center text-xs text-slate-500">Loading chunks...</div>
                  ) : inspectedChunks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Click "Run RAG Pipeline" to generate chunks for the selected document.
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1">
                      {inspectedChunks.map((c, idx) => (
                        <div
                          key={c.id || idx}
                          className="p-4 rounded-2xl liquid-glass-subtle text-xs"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-display">
                              Chunk #{c.chunk_index + 1} (Page {c.page_number})
                            </span>
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                              {c.token_count} tokens
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                            {c.chunk_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STAGE: EMBEDDING */}
              {activeStage === 'embedding' && (
                <div className="space-y-4">
                  <div className="border-b border-black/5 dark:border-white/5 pb-3">
                    <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Vector Embedding Representation
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Every text chunk and user query is mapped to a 384-dimensional dense floating point coordinate vector.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#090A0F] text-slate-100 font-mono text-xs space-y-3 border border-white/10">
                    <div className="flex items-center justify-between text-sky-400 text-[11px]">
                      <span>Model: BAAI/bge-small-en-v1.5</span>
                      <span>Dimension: 384 floats</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block mb-1">Query Vector Coordinate Preview:</span>
                      <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-[11px] text-emerald-400 break-all leading-loose font-mono">
                        {result
                          ? JSON.stringify(result.pipeline.embedding.query_embedding_preview)
                          : '[-0.0381, 0.0824, -0.0152, 0.0491, 0.1205, -0.0634, ... 384 dimensions]'}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl liquid-glass-subtle text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <span className="font-bold block font-display">How Semantic Distance Works:</span>
                    <p className="leading-relaxed">
                      Cosine similarity calculates the cosine of the angle between query vector {"\\(\\vec{q}\\)"} and document vector {"\\(\\vec{d}\\)"}.
                      Identical semantic orientation yields a score of 1.0, orthogonal vectors yield 0.0, and diametrically opposite concepts yield -1.0.
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE: PROMPT AUGMENTATION */}
              {activeStage === 'prompt_augmentation' && (
                <div className="space-y-4">
                  <div className="border-b border-black/5 dark:border-white/5 pb-3">
                    <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Augmented Prompt Sent to LLM
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Observe how the raw question is injected with the retrieved context excerpts.
                    </p>
                  </div>

                  {result ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-display font-bold text-slate-500 uppercase block mb-1">
                          System Instruction:
                        </span>
                        <pre className="p-4 rounded-2xl liquid-glass-subtle text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                          {result.pipeline.prompt_augmentation.system_prompt}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[11px] font-display font-bold text-slate-500 uppercase block mb-1">
                          User Prompt & Injected Context:
                        </span>
                        <pre className="p-4 rounded-2xl liquid-glass-subtle text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                          {result.pipeline.prompt_augmentation.user_prompt}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Run the pipeline to inspect augmented prompt context.
                    </div>
                  )}
                </div>
              )}

              {/* STAGE: RETRIEVAL */}
              {activeStage === 'retrieval' && (
                <div className="space-y-4">
                  <div className="border-b border-black/5 dark:border-white/5 pb-3">
                    <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      ChromaDB Retrieval Matches
                    </h4>
                  </div>
                  {result ? (
                    <div className="space-y-2.5">
                      {result.sources.map((s, idx) => (
                        <div key={idx} className="p-4 rounded-2xl liquid-glass-subtle text-xs">
                          <div className="flex justify-between font-bold mb-1 font-display">
                            <span>{s.document_filename} (Page {s.page_number})</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">Score: {s.similarity_score}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {s.chunk_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">Run the pipeline to inspect retrieval results.</div>
                  )}
                </div>
              )}

              {/* Other stages fallback */}
              {['pdf_input', 'extraction', 'vector_db'].includes(activeStage) && (
                <div className="space-y-4">
                  <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Stage Details: {activeStage.replace('_', ' ').toUpperCase()}
                  </h4>
                  <pre className="p-4 rounded-2xl liquid-glass-subtle font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {result ? JSON.stringify(result.pipeline[activeStage as keyof typeof result.pipeline], null, 2) : 'Run pipeline to populate.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
