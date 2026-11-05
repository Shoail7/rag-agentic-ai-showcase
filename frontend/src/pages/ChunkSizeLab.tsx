import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  Download,
  CheckCircle,
  HelpCircle,
  FileText,
  BarChart3,
  Sparkles,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Header } from '../components/Header';
import { LearnHowItWorks } from '../components/LearnHowItWorks';
import { api } from '../services/api';
import { DocumentItem, ChunkLabResponse } from '../types';

export const ChunkSizeLab: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [question, setQuestion] = useState<string>('How many annual leaves can an employee carry forward?');
  
  // 3 independent experiment configurations
  const [configA, setConfigA] = useState({ chunk_size: 128, chunk_overlap: 20, top_k: 5 });
  const [configB, setConfigB] = useState({ chunk_size: 256, chunk_overlap: 30, top_k: 5 });
  const [configC, setConfigC] = useState({ chunk_size: 400, chunk_overlap: 50, top_k: 5 });

  const [loading, setLoading] = useState(false);
  const [labResult, setLabResult] = useState<ChunkLabResponse | null>(null);

  useEffect(() => {
    api.getDocuments().then((docs) => {
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        const defaultDoc = docs.find(d => d.original_filename.includes('2025')) || docs[0];
        setSelectedDocId(defaultDoc.id);
      }
    }).catch(console.error);
  }, []);

  const handleRunComparison = async () => {
    if (!selectedDocId) {
      alert('Please select a PDF document first.');
      return;
    }
    if (!question.trim()) {
      alert('Please enter a question.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.compareChunkSizes({
        document_id: selectedDocId,
        question,
        config_a: configA,
        config_b: configB,
        config_c: configC
      });
      setLabResult(res);
    } catch (e: any) {
      alert(`Comparison failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportAsJSON = () => {
    if (!labResult) return;
    const blob = new Blob([JSON.stringify(labResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chunk_lab_experiment_${labResult.experiment_id}.json`;
    a.click();
  };

  const exportAsCSV = () => {
    if (!labResult) return;
    const rows = [
      ['Metric', 'Experiment A (128 tokens)', 'Experiment B (256 tokens)', 'Experiment C (400 tokens)'],
      ['Total Chunks', labResult.experiments[0].total_chunks, labResult.experiments[1].total_chunks, labResult.experiments[2].total_chunks],
      ['Average Chunk Size', labResult.experiments[0].average_chunk_size, labResult.experiments[1].average_chunk_size, labResult.experiments[2].average_chunk_size],
      ['Context Tokens Sent', labResult.experiments[0].context_tokens, labResult.experiments[1].context_tokens, labResult.experiments[2].context_tokens],
      ['Retrieval Latency (ms)', labResult.experiments[0].retrieval_latency_ms, labResult.experiments[1].retrieval_latency_ms, labResult.experiments[2].retrieval_latency_ms],
      ['Peak Similarity Score', labResult.experiments[0].top_similarity_score, labResult.experiments[1].top_similarity_score, labResult.experiments[2].top_similarity_score],
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chunk_comparison_${labResult.experiment_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to highlight matching question words
  const highlightQueryTerms = (text: string, q: string) => {
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['what', 'when', 'which', 'how', 'many', 'does', 'from'].includes(w));
    if (words.length === 0) return text;
    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      words.includes(part.toLowerCase()) ? (
        <mark key={i} className="bg-sky-200/80 dark:bg-sky-500/30 text-sky-950 dark:text-sky-200 px-1 py-0.5 rounded font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const learnItems = [
    {
      title: "1. The Fundamental Trade-off: Precision vs Context",
      summary: "Chunk size determines how text is partitioned into vector embeddings.",
      details: "Small chunks (e.g. 128 tokens) yield highly concentrated vector representations where every word contributes strongly to the embedding coordinate. Large chunks (e.g. 400 tokens) preserve whole sections but can dilute specific facts with surrounding noise."
    },
    {
      title: "2. The 'Lost in the Middle' Phenomenon",
      summary: "LLMs attend more strongly to information at the very beginning and end of long contexts.",
      details: "When sending large chunks, the critical sentence might end up buried in the middle of a 2,000 token prompt. Well-sized chunks ensure the relevant sentence is directly prominent."
    },
    {
      title: "3. No Single Winner",
      summary: "The ideal chunk size varies based on document layout and query style.",
      details: "Factoid questions with exact numbers often benefit from fine-grained chunks. Syntheses, policy conditions, and code require larger chunk windows to preserve complete programmatic structures."
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="Chunk Size Laboratory"
        subtitle="Discover how splitting the same document differently changes what AI retrieves and how it answers"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        <LearnHowItWorks moduleName="Chunk Size & Token Boundary Dynamics" items={learnItems} />

        {/* Experiment Setup Card */}
        <div className="liquid-glass rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              Experiment Setup: 1 PDF, 1 Question, 3 Configurations
            </h3>
            <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 font-bold bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full">
              Controlled Laboratory Test
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Select PDF */}
            <div>
              <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Step 1: Choose Document
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs text-slate-900 dark:text-white outline-hidden cursor-pointer"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id} className="dark:bg-slate-900">
                    {d.original_filename} ({d.page_count} pages)
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Question */}
            <div>
              <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Step 2: Enter Question (Identical across all 3)
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How many annual leaves can an employee carry forward?"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>
          </div>

          {/* Step 3: Configure Experiments A, B, C */}
          <div>
            <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-2.5">
              Step 3: Configure 3 Experimental Chunk Slices
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Exp A */}
              <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
                <span className="text-xs font-display font-bold text-slate-900 dark:text-white block">
                  Experiment A (Small Chunks)
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chunk Size:</span>
                    <span className="font-mono font-bold">{configA.chunk_size} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="64"
                    max="200"
                    step="16"
                    value={configA.chunk_size}
                    onChange={(e) => setConfigA({ ...configA, chunk_size: Number(e.target.value) })}
                    className="w-full accent-black dark:accent-white"
                  />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overlap:</span>
                    <span className="font-mono font-bold">{configA.chunk_overlap} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={configA.chunk_size - 10}
                    step="5"
                    value={configA.chunk_overlap}
                    onChange={(e) => setConfigA({ ...configA, chunk_overlap: Number(e.target.value) })}
                    className="w-full accent-black dark:accent-white"
                  />
                </div>
              </div>

              {/* Exp B */}
              <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
                <span className="text-xs font-display font-bold text-slate-900 dark:text-white block">
                  Experiment B (Medium Chunks)
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chunk Size:</span>
                    <span className="font-mono font-bold">{configB.chunk_size} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="350"
                    step="16"
                    value={configB.chunk_size}
                    onChange={(e) => setConfigB({ ...configB, chunk_size: Number(e.target.value) })}
                    className="w-full accent-black dark:accent-white"
                  />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overlap:</span>
                    <span className="font-mono font-bold">{configB.chunk_overlap} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={configB.chunk_size - 10}
                    step="5"
                    value={configB.chunk_overlap}
                    onChange={(e) => setConfigB({ ...configB, chunk_overlap: Number(e.target.value) })}
                    className="w-full accent-black dark:accent-white"
                  />
                </div>
              </div>

              {/* Exp C */}
              <div className="p-4 rounded-2xl liquid-glass-subtle space-y-3">
                <span className="text-xs font-display font-bold text-slate-900 dark:text-white block">
                  Experiment C (Large Chunks)
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chunk Size:</span>
                    <span className="font-mono font-bold">{configC.chunk_size} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="512"
                    step="16"
                    value={configC.chunk_size}
                    onChange={(e) => setConfigC({ ...configC, chunk_size: Number(e.target.value) })}
                    className="w-full accent-black dark:accent-white"
                  />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overlap:</span>
                    <span className="font-mono font-bold">{configC.chunk_overlap} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={configC.chunk_size - 10}
                    step="5"
                    value={configC.chunk_overlap}
                    onChange={(e) => setConfigC({ ...configC, chunk_overlap: Number(e.target.value) })}
                    className="w-full accent-black dark:accent-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={loading}
            className="w-full py-3.5 btn-liquid-pill text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                <span>Running 3 Parallel Chunking Pipelines...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>COMPARE ALL 3 EXPERIMENTS</span>
              </>
            )}
          </button>
        </div>

        {/* Comparison Results */}
        {labResult && (
          <div className="space-y-6">
            {/* Action Bar (Export JSON / CSV) */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Laboratory Output Comparison
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportAsCSV}
                  className="btn-frosted-pill flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={exportAsJSON}
                  className="btn-frosted-pill flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side Metric Comparison Table */}
            <div className="liquid-glass rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px] font-display">
                      <th className="py-4 px-6">Metric</th>
                      <th className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        Exp A ({labResult.experiments[0].chunk_size} tokens)
                      </th>
                      <th className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        Exp B ({labResult.experiments[1].chunk_size} tokens)
                      </th>
                      <th className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        Exp C ({labResult.experiments[2].chunk_size} tokens)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium font-sans">
                    <tr>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300 font-display">Total Chunks Created</td>
                      <td className="py-3.5 px-4 font-mono font-bold">{labResult.experiments[0].total_chunks}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">{labResult.experiments[1].total_chunks}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">{labResult.experiments[2].total_chunks}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300 font-display">Average Chunk Size</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[0].average_chunk_size} tokens</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[1].average_chunk_size} tokens</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[2].average_chunk_size} tokens</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300 font-display">Retrieved Chunks</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[0].retrieved_count}</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[1].retrieved_count}</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[2].retrieved_count}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300 font-display">Context Tokens to LLM</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{labResult.experiments[0].context_tokens}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{labResult.experiments[1].context_tokens}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{labResult.experiments[2].context_tokens}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300 font-display">Retrieval Latency</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[0].retrieval_latency_ms} ms</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[1].retrieval_latency_ms} ms</td>
                      <td className="py-3.5 px-4 font-mono">{labResult.experiments[2].retrieval_latency_ms} ms</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-slate-300 font-display">Peak Similarity Score</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{labResult.experiments[0].top_similarity_score}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{labResult.experiments[1].top_similarity_score}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{labResult.experiments[2].top_similarity_score}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side-by-Side Generated Answers Comparison */}
            <div>
              <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Step 7: Side-by-Side AI Answers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {labResult.experiments.map((exp, idx) => (
                  <div
                    key={idx}
                    className="liquid-glass rounded-3xl p-6 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3 mb-3">
                        <span className="text-xs font-display font-bold text-slate-900 dark:text-white">
                          {exp.label} ({exp.chunk_size} tokens)
                        </span>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                          {exp.context_tokens} ctx tokens
                        </span>
                      </div>
                      <pre className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {exp.generated_answer}
                      </pre>
                    </div>

                    <div className="pt-3 border-t border-black/5 dark:border-white/5 text-[10px] text-slate-400 font-mono">
                      Top Match Sim: {(exp.top_similarity_score * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 6: Retrieved Chunks Inspection with Term Highlighting */}
            <div>
              <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Step 6: Retrieved Chunks for Each Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {labResult.experiments.map((exp, idx) => (
                  <div key={idx} className="space-y-2">
                    <span className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block">
                      {exp.label} Chunks ({exp.retrieved_chunks.length})
                    </span>
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {exp.retrieved_chunks.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-4 rounded-2xl liquid-glass-subtle text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-900 dark:text-white font-display">
                              Chunk #{cIdx + 1} (Page {c.page_number})
                            </span>
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {(c.similarity_score! * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                            {highlightQueryTerms(c.chunk_text, question)}
                          </p>
                          <div className="text-[9px] font-mono text-slate-400">
                            Tokens: {c.token_count} • ID: {c.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 8: Educational Trade-off Analysis */}
            <div className="liquid-glass rounded-3xl p-7 space-y-4">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Step 8: Why Results Differ – The Engineering Trade-off
                </h4>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {labResult.educational_analysis.overview}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">
                    Small Chunks ({labResult.educational_analysis.small_chunks.size})
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {labResult.educational_analysis.small_chunks.characteristics.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">
                    Medium Chunks ({labResult.educational_analysis.medium_chunks.size})
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {labResult.educational_analysis.medium_chunks.characteristics.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">
                    Large Chunks ({labResult.educational_analysis.large_chunks.size})
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {labResult.educational_analysis.large_chunks.characteristics.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 text-xs text-slate-800 dark:text-slate-200">
                <span className="font-display font-bold block mb-1">Key Takeaway for Students:</span>
                <p className="leading-relaxed">{labResult.educational_analysis.recommendation}</p>
              </div>
            </div>

            {/* Step 9: Recharts Visualizations */}
            <div className="liquid-glass rounded-3xl p-7 space-y-4">
              <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Step 9: Benchmark Charts (Context Tokens & Latency)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Chart 1: Context Tokens by Configuration */}
                <div>
                  <span className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-3 text-center">
                    Context Tokens Sent to LLM (Prompt Budget)
                  </span>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={labResult.chart_data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="context_tokens" fill="#6366f1" radius={[12, 12, 0, 0]} name="Context Tokens" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Retrieval Latency (ms) */}
                <div>
                  <span className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-3 text-center">
                    Vector Retrieval Latency (ms)
                  </span>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={labResult.chart_data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="retrieval_ms" fill="#10b981" radius={[12, 12, 0, 0]} name="Latency (ms)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
