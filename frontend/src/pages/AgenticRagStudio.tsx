import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle,
  FileText,
  Sparkles,
  Table
} from 'lucide-react';
import { Header } from '../components/Header';
import { LearnHowItWorks } from '../components/LearnHowItWorks';
import { api } from '../services/api';
import { DocumentItem, AgenticRAGResponse } from '../types';

export const AgenticRagStudio: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<string>(
    'Compare the annual leave policies in the 2024 and 2025 employee handbooks. Explain every change and identify which year provides better benefits.'
  );
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [agenticResult, setAgenticResult] = useState<AgenticRAGResponse | null>(null);

  useEffect(() => {
    api.getDocuments().then((docs) => {
      setDocuments(docs);
      if (docs.length > 0 && selectedDocIds.length === 0) {
        const sampleIds = docs
          .filter(d => d.original_filename.includes('2024') || d.original_filename.includes('2025'))
          .map(d => d.id);
        setSelectedDocIds(sampleIds.length > 0 ? sampleIds : [docs[0].id]);
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

  const handleRunAgenticRAG = async () => {
    if (!question.trim()) return;
    try {
      setLoading(true);
      const res = await api.queryAgenticRAG({
        question,
        document_ids: selectedDocIds,
        max_retries: maxRetries,
        chunk_size: 256,
        chunk_overlap: 30
      });
      setAgenticResult(res);
    } catch (e: any) {
      alert(`Agentic RAG failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const demoQuestions = [
    "Compare the annual leave policies in the 2024 and 2025 employee handbooks. Explain every change and identify which year provides better benefits.",
    "Compare overtime, work-from-home, medical insurance and learning budgets between 2024 and 2025.",
    "Which year provides better medical insurance coverage and what are the specific policy limits?",
    "Compare partner leave and maternity benefits between the 2024 and 2025 handbooks.",
    "Compare all employee benefits between 2024 and 2025, identify every improvement and reduction, and support every finding with evidence from both documents."
  ];

  const learnItems = [
    {
      title: "1. What is Agentic RAG?",
      summary: "An advanced pattern where an autonomous agent actively orchestrates and oversees retrieval rather than performing a single static lookup.",
      details: "In conventional RAG, the query is embedded once and chunks are blindly returned to the LLM. In Agentic RAG, an agent plans sub-searches, evaluates the relevance of what was retrieved, rewrites queries if information is missing, and combines facts across multiple documents."
    },
    {
      title: "2. Question Decomposition",
      summary: "Breaking down a multi-variable query into targeted, document-specific sub-questions.",
      details: "Comparing 2024 and 2025 handbooks cannot be solved well with a single generic query. Decomposition splits the question into targeted searches for Document A and Document B."
    },
    {
      title: "3. Retrieval Quality Evaluation & Self-Correction (Retry)",
      summary: "The agent critiques the retrieved chunks: did we find the required numbers or caps? If no, it rewrites the query and retries.",
      details: "If the first retrieval only finds introductory background text, the agent detects the lack of concrete numerical data, formulates an improved query targeting the policy schedule, and searches again (up to max retries)."
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="Agentic RAG Studio"
        subtitle="Autonomous retrieval orchestration with question decomposition, multi-source synthesis, and self-correction"
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <LearnHowItWorks moduleName="Agentic RAG & Iterative Retrieval" items={learnItems} />

        {/* Input & Target Documents Panel */}
        <div className="liquid-glass rounded-3xl p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Multi-Document Agentic RAG Query
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">Max Search Retries:</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMaxRetries(r)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer font-mono ${
                      maxRetries === r
                        ? 'btn-liquid-pill shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Selection Chips */}
          <div>
            <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Target Documents in Library:
            </label>
            <div className="flex flex-wrap gap-2.5">
              {documents.map((d) => {
                const isSelected = selectedDocIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => handleToggleDoc(d.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white shadow-xs'
                        : 'bg-white/60 dark:bg-white/5 border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{d.original_filename}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Textarea */}
          <div>
            <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Complex or Comparative Question:
            </label>
            <textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full p-3.5 rounded-2xl liquid-glass-subtle text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 outline-hidden resize-none transition-all"
            />
          </div>

          {/* Preset Questions Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Suggested Comparative Inquiries:
            </span>
            <div className="flex flex-wrap gap-2">
              {demoQuestions.map((dq, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuestion(dq)}
                  className="text-[11px] px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer truncate max-w-md font-medium"
                >
                  {dq}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunAgenticRAG}
            disabled={loading}
            className="w-full py-3.5 btn-liquid-pill text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                <span>Agent Decomposing & Searching...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Execute Agentic RAG</span>
              </>
            )}
          </button>
        </div>

        {/* Execution Panel */}
        {agenticResult && (
          <div className="space-y-6">
            {/* Planner Decomposition Card */}
            <div className="liquid-glass rounded-3xl p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  Agent Planner: Question Decomposition
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Total Sub-Tasks: {agenticResult.sub_questions.length} • Retries: {agenticResult.retry_count}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agenticResult.sub_questions.map((sq) => (
                  <div
                    key={sq.id}
                    className="p-4 rounded-2xl liquid-glass-subtle text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white font-display">
                      <span>{sq.target_doc.filename}</span>
                      <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                        {sq.aspect}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
                      {sq.text}
                    </p>
                    <div className="text-[10px] font-mono text-slate-400">
                      Initial Query: "{sq.search_query}"
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Iterative Search Trace & Quality Evaluation */}
            <div className="liquid-glass rounded-3xl p-7 space-y-4">
              <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                Iterative Retrieval & Quality Evaluation Trace
              </h4>

              <div className="space-y-3">
                {agenticResult.execution_trace.map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl liquid-glass-subtle text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold font-display">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                          Attempt #{tr.search_attempt}
                        </span>
                        <span>{tr.document}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                        tr.is_sufficient
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                      }`}>
                        {tr.is_sufficient ? 'Sufficient Context Found' : 'Insufficient Specifics'}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      Executed Query: <span className="font-bold text-slate-900 dark:text-white">"{tr.query}"</span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 font-display">Evaluation: </span>
                      {tr.evaluation}
                    </div>

                    {tr.retry_action && (
                      <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pt-1">
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Self-Correction: {tr.retry_action}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Final Grounded Synthesis Card */}
            <div className="liquid-glass rounded-3xl p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <Table className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Agentic Grounded Synthesis & Comparison
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Execution completed in {agenticResult.duration_sec}s
                </span>
              </div>

              <div className="p-6 rounded-2xl liquid-glass-subtle">
                <pre className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {agenticResult.final_answer}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
