import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Clock,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Server,
  Layers,
  HelpCircle,
  Activity,
  CheckCircle2,
  Info,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../services/api';
import { ModelLimitsResponse, ModelLimitItem } from '../types';

export const LimitCheck: React.FC = () => {
  const [data, setData] = useState<ModelLimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  // Live countdown state
  const [rollingSeconds, setRollingSeconds] = useState<number>(60);
  const [groqSecondsLeft, setGroqSecondsLeft] = useState<number>(0);
  const [geminiSecondsLeft, setGeminiSecondsLeft] = useState<number>(0);

  // Token Budget Estimator state
  const [calcModelId, setCalcModelId] = useState<string>('gemini-2.5-flash');
  const [calcTopK, setCalcTopK] = useState<number>(5);
  const [calcChunkSize, setCalcChunkSize] = useState<number>(200);
  const [calcQuestionLength, setCalcQuestionLength] = useState<number>(50);

  const fetchLimits = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getModelLimits();
      setData(res);
      const groqSec = res.reset_cadence?.groq_seconds_until_reset ?? res.reset_reference?.groq_seconds_until_reset ?? 0;
      const geminiSec = res.reset_cadence?.gemini_seconds_until_reset ?? res.reset_reference?.gemini_seconds_until_reset ?? 0;
      setGroqSecondsLeft(groqSec);
      setGeminiSecondsLeft(geminiSec);
    } catch (e: any) {
      setError(e.message || 'Failed to load model limit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  // Ticking countdown clock every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      // Rolling 60s window: counts down based on current wall-clock second
      const now = new Date();
      setRollingSeconds(60 - now.getSeconds());

      setGroqSecondsLeft((prev) => (prev > 0 ? prev - 1 : 86400));
      setGeminiSecondsLeft((prev) => (prev > 0 ? prev - 1 : 86400));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatHMS = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const filteredModels = data?.models.filter((m) => {
    if (selectedProvider === 'all') return true;
    return m.provider === selectedProvider;
  }) || [];

  // Calculation for Token Budget widget
  const selectedCalcModel = data?.models.find((m) => m.id === calcModelId) || data?.models[0];
  const estimatedPromptTokens = calcQuestionLength + calcTopK * calcChunkSize + 150; // 150 for system framing
  const modelTpm = typeof selectedCalcModel?.limits.tpm === 'number' ? selectedCalcModel.limits.tpm : null;
  const tpmPercentage = modelTpm ? Math.min(100, (estimatedPromptTokens / modelTpm) * 100) : 0;
  const maxQueriesPerMin = modelTpm ? Math.floor(modelTpm / Math.max(1, estimatedPromptTokens)) : 'Unlimited';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      <Header
        title="Limit Check & Quota Monitor"
        subtitle="Live token limits, request limits (RPM/TPM/RPD), and exact reset schedules across all models"
      />

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Top Hero Glass Bar with Live Timers */}
        <div className="liquid-glass p-6 rounded-3xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-display">
                  Live Quota Telemetry
                </span>
              </div>
              <h2 className="text-xl font-display font-semibold text-slate-900 dark:text-white">
                API Rate Limits & Reset Windows
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Free-tier models enforce minute-level rate limits (RPM, TPM) and daily quotas (RPD).
                Monitor the exact windows when your allocations reset to avoid HTTP 429 throttling.
              </p>
            </div>

            {/* Live Reset Clocks Pill Group */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              {/* Rolling 60s Window */}
              <div className="liquid-glass-subtle p-3.5 rounded-2xl border border-white/80 dark:border-white/10 flex flex-col items-center justify-center text-center min-w-[130px]">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-display">RPM / TPM Window</span>
                </div>
                <div className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {rollingSeconds}s
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Rolling 60s reset
                </span>
              </div>

              {/* Groq Daily Reset */}
              <div className="liquid-glass-subtle p-3.5 rounded-2xl border border-white/80 dark:border-white/10 flex flex-col items-center justify-center text-center min-w-[140px]">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-display">Groq Midnight UTC</span>
                </div>
                <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatHMS(groqSecondsLeft)}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Resets daily at 00:00 UTC
                </span>
              </div>

              {/* Gemini Daily Reset */}
              <div className="liquid-glass-subtle p-3.5 rounded-2xl border border-white/80 dark:border-white/10 flex flex-col items-center justify-center text-center min-w-[140px]">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-display">Gemini Midnight PT</span>
                </div>
                <div className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {formatHMS(geminiSecondsLeft)}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Resets daily at 08:00 UTC
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl liquid-glass-subtle border border-white/60 dark:border-white/10">
            {[
              { id: 'all', label: 'All Providers & Models' },
              { id: 'gemini', label: 'Google Gemini' },
              { id: 'groq', label: 'Groq Cloud' },
              { id: 'ollama', label: 'Ollama Local' },
              { id: 'sentence_transformers', label: 'Embeddings (Local)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedProvider(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  selectedProvider === tab.id
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLimits}
            disabled={loading}
            className="btn-frosted-pill flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            title="Refresh Quota Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Models Limit Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="liquid-glass rounded-3xl p-5 flex flex-col justify-between border border-white/70 dark:border-white/10 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
            >
              <div>
                {/* Header with Provider Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-display">
                        {model.provider_name}
                      </span>
                      {model.is_active && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white mt-0.5">
                      {model.name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                    {model.tier}
                  </span>
                </div>

                {/* Quota Metric Pills */}
                <div className="grid grid-cols-3 gap-2 my-4">
                  <div className="liquid-glass-subtle p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-mono font-medium">
                      RPM Limit
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                      {typeof model.limits.rpm === 'number' ? `${model.limits.rpm}/min` : model.limits.rpm}
                    </span>
                  </div>

                  <div className="liquid-glass-subtle p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-mono font-medium">
                      TPM Limit
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5 block truncate" title={String(model.limits.tpm)}>
                      {typeof model.limits.tpm === 'number'
                        ? model.limits.tpm >= 1000000
                          ? `${(model.limits.tpm / 1000000).toFixed(0)}M/min`
                          : `${(model.limits.tpm / 1000).toFixed(0)}k/min`
                        : 'Unlimited'}
                    </span>
                  </div>

                  <div className="liquid-glass-subtle p-2.5 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-mono font-medium">
                      RPD Limit
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                      {typeof model.limits.rpd === 'number' ? `${model.limits.rpd}/day` : model.limits.rpd}
                    </span>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="space-y-2 text-xs border-t border-slate-200/50 dark:border-white/[0.06] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Context Window:
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {model.limits.context_window.toLocaleString()} tokens
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-slate-400" />
                      Max Output:
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {model.limits.max_output_tokens.toLocaleString()} tokens
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Reset Timing:
                    </span>
                    <span className="text-right text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                      {model.reset_schedule.minute_reset.includes('60 seconds')
                        ? '60s rolling + Daily midnight'
                        : model.reset_schedule.minute_reset}
                    </span>
                  </div>
                </div>
              </div>

              {/* Best For & Rate Limit Mitigation */}
              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/[0.06] space-y-2">
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">Recommended for: </strong>
                  {model.recommended_for}
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400/90 bg-amber-500/10 dark:bg-amber-400/10 p-2.5 rounded-xl border border-amber-500/20">
                  <strong>Pacing Tip: </strong>
                  {model.rate_limit_mitigation}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive RAG Token Budget Calculator */}
        <div className="liquid-glass p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                  RAG Prompt Token Budget Calculator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estimate token consumption per query and see if you will stay comfortably within free-tier limits
                </p>
              </div>
            </div>
            <div className="text-xs font-mono px-3 py-1.5 rounded-full liquid-glass-subtle text-indigo-600 dark:text-indigo-400">
              Interactive Educational Tool
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Target Model
              </label>
              <select
                value={calcModelId}
                onChange={(e) => setCalcModelId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/70 dark:bg-white/[0.06] border border-white/80 dark:border-white/10 text-slate-800 dark:text-white font-medium"
              >
                {data?.models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-stone-900 text-slate-900 dark:text-white">
                    {m.name} ({m.provider_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Chunk Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Chunk Size
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {calcChunkSize} tokens
                </span>
              </div>
              <input
                type="range"
                min={64}
                max={512}
                step={32}
                value={calcChunkSize}
                onChange={(e) => setCalcChunkSize(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Top K Chunks */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Retrieved Chunks (Top K)
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {calcTopK} chunks
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={calcTopK}
                onChange={(e) => setCalcTopK(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Question Length */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  User Question Length
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  ~{calcQuestionLength} tokens
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={10}
                value={calcQuestionLength}
                onChange={(e) => setCalcQuestionLength(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          {/* Budget Calculation Output */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="liquid-glass-subtle p-4 rounded-2xl border border-white/60 dark:border-white/10">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Estimated Prompt Size
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                ~{estimatedPromptTokens.toLocaleString()} <span className="text-xs font-normal text-slate-400">tokens</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Context = {calcTopK} × {calcChunkSize} + {calcQuestionLength} + 150 prompt system framing
              </div>
            </div>

            <div className="liquid-glass-subtle p-4 rounded-2xl border border-white/60 dark:border-white/10">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                TPM Consumption per Request
              </div>
              <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {typeof modelTpm === 'number' ? `${tpmPercentage.toFixed(2)}%` : '0% (Local)'}
              </div>
              <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, tpmPercentage)}%` }}
                />
              </div>
            </div>

            <div className="liquid-glass-subtle p-4 rounded-2xl border border-white/60 dark:border-white/10">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Safe Queries / Minute (RPM / TPM)
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {maxQueriesPerMin === 'Unlimited'
                  ? 'Unlimited'
                  : `${Math.min(Number(selectedCalcModel?.limits.rpm) || 15, maxQueriesPerMin)} queries/min`}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Bounded by minimum of RPM ({selectedCalcModel?.limits.rpm}) and TPM throughput
              </div>
            </div>
          </div>
        </div>

        {/* Rate Limit Mitigation & Troubleshooting Guide */}
        <div className="liquid-glass p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Handling HTTP 429 Rate Limits: Practical Engineering Guide
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="liquid-glass-subtle p-4 rounded-2xl space-y-2 border border-white/60 dark:border-white/10">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                1. Exponential Backoff
              </div>
              <p>
                When a provider returns HTTP 429 (`ResourceExhausted` for Gemini or `rate_limit_exceeded` for Groq),
                wait 2 seconds, then 4 seconds, then 8 seconds before retrying.
              </p>
            </div>

            <div className="liquid-glass-subtle p-4 rounded-2xl space-y-2 border border-white/60 dark:border-white/10">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-500" />
                2. Sliding Window vs Daily Reset
              </div>
              <p>
                RPM and TPM reset continuously across a rolling 60-second window. If throttled on a burst,
                pausing for 60 seconds clears your minute allocation completely.
              </p>
            </div>

            <div className="liquid-glass-subtle p-4 rounded-2xl space-y-2 border border-white/60 dark:border-white/10">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-500" />
                3. Zero-Limit Fallback to Ollama
              </div>
              <p>
                If your cloud daily quota (RPD) is depleted for the day, switch seamlessly to Ollama in the Settings tab
                to continue full RAG and agent simulations offline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
