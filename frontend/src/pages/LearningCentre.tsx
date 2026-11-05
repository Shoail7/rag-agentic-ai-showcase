import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Search,
  Bot,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Header } from '../components/Header';

export const LearningCentre: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<'rag' | 'agents' | 'agentic' | 'chunking'>('rag');

  const topics = [
    { id: 'rag', label: '1. RAG (Conventional)', icon: Search },
    { id: 'agents', label: '2. AI Agents', icon: Bot },
    { id: 'agentic', label: '3. Agentic RAG', icon: Cpu },
    { id: 'chunking', label: '4. Chunk Size Dynamics', icon: Layers },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="Educational Learning Centre"
        subtitle="Theoretical foundations, system architectures, and comparative engineering principles"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2.5 border-b border-black/5 dark:border-white/5 pb-3">
          {topics.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedTopic === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTopic(t.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-display font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'btn-liquid-pill shadow-xs'
                    : 'liquid-glass-subtle text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Section: Conventional RAG */}
        {selectedTopic === 'rag' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="liquid-glass rounded-3xl p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white">
                  Conventional RAG: Retrieval-Augmented Generation
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Conventional RAG operates as a deterministic, single-pass pipeline designed to overcome the knowledge boundary of Large Language Models. Without RAG, an LLM only knows facts present in its pretraining corpus and may hallucinate when asked about proprietary company policies.
              </p>

              {/* Visual Flow Diagram */}
              <div className="p-5 rounded-2xl liquid-glass-subtle">
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 block mb-3 font-mono">
                  The 8-Stage Conventional Pipeline
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium font-display">
                  <span className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">PDF File</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">Text Extraction</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">Token Chunking</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">Vector Embeddings</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">FAISS Index</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">Cosine Retrieval</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200">Prompt Augmentation</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-3 py-1.5 rounded-full btn-liquid-pill text-xs">Grounded Answer</span>
                </div>
              </div>

              {/* Glossary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-1.5">
                  <h4 className="text-xs font-display font-bold text-slate-900 dark:text-white">What is Token-Aware Chunking?</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    Splits raw text according to the exact tokenizer vocabulary of the embedding model (e.g., BAAI/bge-small-en-v1.5). Overlapping tokens bridge adjacent chunks so sentences on boundaries maintain continuity.
                  </p>
                </div>
                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-1.5">
                  <h4 className="text-xs font-display font-bold text-slate-900 dark:text-white">What is Semantic Vector Search?</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    Vectors map conceptual intent into 384 numbers. Queries like "annual leave carry forward" match chunks saying "unused vacation rollover" even if the specific words differ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Section: AI Agents */}
        {selectedTopic === 'agents' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="liquid-glass rounded-3xl p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white">
                  AI Agents: Tool Calling & Autonomous Execution
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                An AI Agent is more than an answer generator. It possesses an ongoing reasoning loop (ReAct: Reason + Act) that empowers it to interact with external environments, invoke deterministic tools (Calculators, Date Resolvers, Search APIs), observe outputs, and adapt its plan dynamically.
              </p>

              <div className="p-5 rounded-2xl liquid-glass-subtle space-y-3">
                <h4 className="text-xs font-display font-bold text-slate-900 dark:text-white">The Core ReAct Loop</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono pt-1">
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-center shadow-xs">
                    <span className="font-bold text-slate-900 dark:text-white block font-display">1. THINK</span>
                    <span className="text-[10px] text-slate-500">Analyze goal & plan next step</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-center shadow-xs">
                    <span className="font-bold text-slate-900 dark:text-white block font-display">2. ACT</span>
                    <span className="text-[10px] text-slate-500">Execute tool with arguments</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-center shadow-xs">
                    <span className="font-bold text-slate-900 dark:text-white block font-display">3. OBSERVE</span>
                    <span className="text-[10px] text-slate-500">Inspect tool return value</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-center shadow-xs">
                    <span className="font-bold text-slate-900 dark:text-white block font-display">4. SYNTHESIZE</span>
                    <span className="text-[10px] text-slate-500">Assemble final verified answer</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl liquid-glass-subtle space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-normal">
                <span className="font-display font-bold text-slate-900 dark:text-white block">Safety Guarantees & Consequential Actions:</span>
                <p className="leading-relaxed">
                  Agents in production must be guarded by strict step ceilings (e.g. maximum 10 steps), timeout limits, tool validation, and stop-action hooks to prevent infinite recursive loops or runaway API billing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Agentic RAG */}
        {selectedTopic === 'agentic' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="liquid-glass rounded-3xl p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white">
                  Agentic RAG: Multi-Document Autonomous Retrieval
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Agentic RAG combines the strengths of conventional vector retrieval with the cognitive reasoning of AI agents. Instead of running a single vector lookup, the agent treats the vector database as an on-demand tool, iteratively querying, critiquing results, and rewriting queries until all necessary evidence is gathered.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">1. Decomposition</span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Complex multi-policy questions are decomposed into specific target searches across separate document years (e.g., 2024 vs 2025).
                  </p>
                </div>

                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">2. Self-Evaluation</span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    The agent checks whether retrieved text includes key numerical values (e.g. days or limits) or merely generic boilerplate.
                  </p>
                </div>

                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">3. Bounded Retry</span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    If quality is insufficient, it rewrites the query (e.g., targeting Appendix A policy schedules) and executes a bounded retry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Chunking Dynamics */}
        {selectedTopic === 'chunking' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="liquid-glass rounded-3xl p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white">
                  Chunk Size Dynamics & Engineering Trade-offs
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Chunk size is the single most influential hyperparameter in RAG system design. There is no silver bullet: varying the chunk size directly shifts the operating point along the precision-recall curve.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">Small (128 Tokens)</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    High retrieval specificity. Excellent for locating exact numbers and isolated clauses. However, loses broad contextual premises and preceding conditional qualifiers.
                  </p>
                </div>
                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">Medium (256 Tokens)</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    Industry sweet spot. Maintains complete paragraph cohesion while remaining concise enough for fast cosine distance ranking and low token overhead.
                  </p>
                </div>
                <div className="p-5 rounded-2xl liquid-glass-subtle space-y-2">
                  <span className="font-display font-bold text-slate-900 dark:text-white block">Large (400+ Tokens)</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    Captures entire subsections and bullet lists. However, irrelevant words dilute the vector embedding, and large prompts risk triggering LLM attention fatigue.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
