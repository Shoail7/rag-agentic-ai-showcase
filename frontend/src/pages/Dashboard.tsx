import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Bot,
  Cpu,
  Layers,
  FileText,
  Sparkles,
  ArrowRight,
  Database,
  ShieldCheck,
  CheckCircle,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../services/api';
import { DocumentItem } from '../types';

export const Dashboard: React.FC = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = () => {
    setLoading(true);
    api.getDocuments()
      .then(setDocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const totalPages = docs.reduce((acc, d) => acc + (d.page_count || 0), 0);
  const totalChunks = docs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  const modules = [
    {
      title: 'RAG Explorer',
      path: '/rag-explorer',
      badge: 'Conventional RAG',
      accent: 'from-sky-400 to-blue-600',
      icon: Search,
      desc: 'Trace the complete conventional RAG flow: text extraction, token chunking, local vector embedding, similarity retrieval, and prompt augmentation.',
    },
    {
      title: 'AI Agent Studio',
      path: '/agent-studio',
      badge: 'Tool Calling',
      accent: 'from-violet-500 to-purple-600',
      icon: Bot,
      desc: 'Watch an autonomous agent think, select tools (Calculator, Date Calculator, Mock Travel, CSV Analysis), observe outcomes, and complete complex multi-step tasks.',
    },
    {
      title: 'Agentic RAG Studio',
      path: '/agentic-rag-studio',
      badge: 'Autonomous Retrieval',
      accent: 'from-fuchsia-500 to-pink-600',
      icon: Cpu,
      desc: 'Agent-driven retrieval with query decomposition, multi-document synthesis, quality evaluation, and bounded search retries between 2024 & 2025 handbooks.',
    },
    {
      title: 'Chunk Size Laboratory',
      path: '/chunk-lab',
      badge: 'Core Experiment',
      accent: 'from-emerald-400 to-teal-600',
      icon: Layers,
      desc: 'Run the SAME question through 3 different chunk sizes (128 vs 256 vs 400 tokens) side-by-side. Inspect retrieved chunks and evaluate context vs precision trade-offs.',
    },
  ];

  const demoQuestions = [
    { q: "How many annual leaves can an employee carry forward?", target: "Chunk Size Laboratory", path: "/chunk-lab" },
    { q: "Compare annual leave and overtime between 2024 and 2025 handbooks", target: "Agentic RAG Studio", path: "/agentic-rag-studio" },
    { q: "Plan a two-day Goa trip under ₹10,000", target: "AI Agent Studio", path: "/agent-studio" },
    { q: "What is the standard employee probation period in 2025?", target: "RAG Explorer", path: "/rag-explorer" }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="AI Learning Lab Dashboard"
        subtitle="Interactive laboratory for RAG, AI Agents, and Chunking Architectures"
        onSampleLoaded={fetchDocs}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Liquid Hero Section (matching the user's reference layout) */}
        <div className="relative py-8 px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-display">
                AI Learning Lab Platform
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-light text-slate-900 dark:text-white tracking-[-0.03em] leading-[1.12]">
                Elevate Your AI Engineering <br />
                <span className="font-semibold text-slate-950 dark:text-white">Experience</span>
              </h2>
              <div className="pt-2 flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 ring-2 ring-white dark:ring-slate-900" />
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-400 to-pink-500 ring-2 ring-white dark:ring-slate-900" />
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Used by students & developers learning AI engineering
                </span>
              </div>
            </div>

            {/* Right Subtitle & Pill CTA Button */}
            <div className="lg:col-span-5 space-y-5 lg:pl-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Unlock your AI development potential in an interactive educational laboratory powered by real PyMuPDF extraction, local BGE vector embeddings, and multi-step tool-calling agents.
              </p>
              <div>
                <Link
                  to="/rag-explorer"
                  className="btn-liquid-pill inline-flex items-center gap-2.5 px-6 py-3 text-xs font-semibold shadow-md cursor-pointer"
                >
                  <span>Explore Modules & Run Tests</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Frosted Glass Cards (matching reference bottom cards) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="liquid-glass rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">PDF Documents</span>
                <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Indexed Handbooks
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                PyMuPDF extracted & deduplicated
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-baseline justify-between">
              <span className="text-3xl font-display font-light text-slate-900 dark:text-white tracking-tight">
                {loading ? '...' : `${docs.length}`}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {totalPages} pages
              </span>
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Vector Storage</span>
                <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200">
                  <Database className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                FAISS Vector Indexes
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Persistent local vector indexes
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-baseline justify-between">
              <span className="text-3xl font-display font-light text-slate-900 dark:text-white tracking-tight">
                {loading ? '...' : `${totalChunks}+`}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Vector chunks
              </span>
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Local Embeddings</span>
                <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Zero Cost Model
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                BAAI/bge-small-en-v1.5
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-baseline justify-between">
              <span className="text-3xl font-display font-light text-slate-900 dark:text-white tracking-tight">
                384
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Local CPU dims
              </span>
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">LLM Provider</span>
                <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Abstraction Layer
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gemini • Groq • Ollama
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-baseline justify-between">
              <span className="text-3xl font-display font-light text-slate-900 dark:text-white tracking-tight">
                3
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Free providers
              </span>
            </div>
          </div>
        </div>

        {/* 4 Core Learning Modules Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-display">
              Interactive Laboratories
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              4 Educational Pillars
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modules.map((m, idx) => {
              const Icon = m.icon;
              return (
                <Link
                  key={idx}
                  to={m.path}
                  className="liquid-glass rounded-3xl p-7 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-medium bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {m.badge}
                      </span>
                    </div>
                    <h4 className="text-lg font-display font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                      {m.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-normal">
                      {m.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-medium text-slate-900 dark:text-white">
                    <span>Launch Module</span>
                    <div className="w-7 h-7 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-900 flex items-center justify-center transition-transform group-hover:translate-x-1 shadow-xs">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Demo Inquiries Pill Bar */}
        <div className="liquid-glass rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <h4 className="text-xs font-bold font-display uppercase tracking-wider text-slate-900 dark:text-white">
              Instant Demonstration Prompts (Pre-Indexed with Nexora Handbooks)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {demoQuestions.map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                className="liquid-glass-subtle flex items-center justify-between p-3.5 rounded-2xl text-xs text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-all group"
              >
                <span className="font-medium truncate pr-2">"{item.q}"</span>
                <span className="text-[10px] shrink-0 font-medium px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all">
                  {item.target}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
