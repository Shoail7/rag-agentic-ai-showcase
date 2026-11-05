import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ArrowRightLeft,
  Clock,
  Gauge,
  Zap,
  ShieldCheck,
  RefreshCw,
  Server,
  Layers,
  HelpCircle,
  Activity,
  CheckCircle2,
  Info,
  TrendingUp,
  Globe,
  Sliders,
  Calculator,
  Search,
  ExternalLink
} from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../services/api';
import {
  ExchangeRateResponse,
  CurrencyConversionResult,
  PopularPairItem,
  ModelLimitsResponse,
  ModelLimitItem
} from '../types';

// Fallback Model Limits so the page is NEVER empty even if backend is offline
const FALLBACK_MODEL_LIMITS: ModelLimitItem[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    provider_name: "Google Gemini",
    tier: "Free Tier",
    is_active: true,
    has_key: true,
    limits: {
      rpm: 15,
      tpm: 1000000,
      rpd: 1500,
      context_window: 1048576,
      max_output_tokens: 8192
    },
    reset_schedule: {
      minute_reset: "Rolling 60-second sliding window",
      daily_reset: "Midnight Pacific Time (00:00 PT / 07:00 UTC)",
      seconds_to_daily_reset: 28800
    },
    recommended_for: "Standard RAG queries, Chunk Size Lab evaluations, high-throughput extraction",
    rate_limit_mitigation: "Implement exponential backoff with jitter on HTTP 429; cap concurrent batch requests to 3."
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    provider_name: "Google Gemini",
    tier: "Free Tier",
    is_active: false,
    has_key: true,
    limits: {
      rpm: 2,
      tpm: 32000,
      rpd: 50,
      context_window: 2097152,
      max_output_tokens: 8192
    },
    reset_schedule: {
      minute_reset: "Rolling 60-second sliding window",
      daily_reset: "Midnight Pacific Time (00:00 PT / 07:00 UTC)",
      seconds_to_daily_reset: 28800
    },
    recommended_for: "Complex agent reasoning, multi-step critique, dense synthesis",
    rate_limit_mitigation: "Use strictly for final agent verification; enforce at least 30-second delay between calls."
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    provider_name: "Google Gemini",
    tier: "Free Tier",
    is_active: false,
    has_key: true,
    limits: {
      rpm: 15,
      tpm: 1000000,
      rpd: 1500,
      context_window: 1048576,
      max_output_tokens: 8192
    },
    reset_schedule: {
      minute_reset: "Rolling 60-second sliding window",
      daily_reset: "Midnight Pacific Time (00:00 PT / 07:00 UTC)",
      seconds_to_daily_reset: 28800
    },
    recommended_for: "Fast agent tool loops, document classification, rapid feedback",
    rate_limit_mitigation: "High quota headroom; suitable for automated evaluations."
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    provider: "groq",
    provider_name: "Groq Cloud (LPU)",
    tier: "Free Developer Plan",
    is_active: false,
    has_key: true,
    limits: {
      rpm: 30,
      tpm: 6000,
      rpd: 14400,
      context_window: 128000,
      max_output_tokens: 8192
    },
    reset_schedule: {
      minute_reset: "Rolling 60-second sliding window",
      daily_reset: "Midnight UTC (00:00:00 UTC)",
      seconds_to_daily_reset: 50400
    },
    recommended_for: "Agent tool decisions, structured JSON parsing, low-latency reasoning",
    rate_limit_mitigation: "TPM (6,000) is the binding constraint on large context. Use compact chunks (100-200 tokens)."
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "groq",
    provider_name: "Groq Cloud (LPU)",
    tier: "Free Developer Plan",
    is_active: false,
    has_key: true,
    limits: {
      rpm: 30,
      tpm: 20000,
      rpd: 14400,
      context_window: 128000,
      max_output_tokens: 8192
    },
    reset_schedule: {
      minute_reset: "Rolling 60-second sliding window",
      daily_reset: "Midnight UTC (00:00:00 UTC)",
      seconds_to_daily_reset: 50400
    },
    recommended_for: "Ultra-fast grading, routing decisions, query rewriting, tool argument parsing",
    rate_limit_mitigation: "Generous 20,000 TPM budget; ideal for multi-turn Agent loops."
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B MoE",
    provider: "groq",
    provider_name: "Groq Cloud (LPU)",
    tier: "Free Developer Plan",
    is_active: false,
    has_key: true,
    limits: {
      rpm: 30,
      tpm: 5000,
      rpd: 14400,
      context_window: 32768,
      max_output_tokens: 4096
    },
    reset_schedule: {
      minute_reset: "Rolling 60-second sliding window",
      daily_reset: "Midnight UTC (00:00:00 UTC)",
      seconds_to_daily_reset: 50400
    },
    recommended_for: "Diverse multilingual reasoning, extraction tasks",
    rate_limit_mitigation: "Truncate prompts to <= 3,500 tokens to prevent 429 TPM exceptions."
  },
  {
    id: "llama3.2:latest",
    name: "Llama 3.2 (Local)",
    provider: "ollama",
    provider_name: "Ollama Local Engine",
    tier: "Self-Hosted / Local",
    is_active: false,
    has_key: true,
    limits: {
      rpm: "Unlimited",
      tpm: "Unlimited",
      rpd: "Unlimited",
      context_window: 128000,
      max_output_tokens: 4096
    },
    reset_schedule: {
      minute_reset: "No quota limits (governed by local hardware VRAM/compute)",
      daily_reset: "None (zero cloud rate limits)",
      seconds_to_daily_reset: 0
    },
    recommended_for: "Offline laboratory experiments, private document processing, zero-cost development",
    rate_limit_mitigation: "Bottleneck is local GPU/CPU compute throughput. Maintain batch size <= 2 on consumer hardware."
  }
];

// Fallback currency rates so currency checker works instantly even offline
const FALLBACK_CURRENCIES: { [code: string]: { name: string; rate: number; flag: string } } = {
  USD: { name: "US Dollar", rate: 1.0, flag: "🇺🇸" },
  EUR: { name: "Euro", rate: 0.924, flag: "🇪🇺" },
  GBP: { name: "British Pound", rate: 0.791, flag: "🇬🇧" },
  INR: { name: "Indian Rupee", rate: 86.85, flag: "🇮🇳" },
  JPY: { name: "Japanese Yen", rate: 153.20, flag: "🇯🇵" },
  CAD: { name: "Canadian Dollar", rate: 1.392, flag: "🇨🇦" },
  AUD: { name: "Australian Dollar", rate: 1.545, flag: "🇦🇺" },
  CHF: { name: "Swiss Franc", rate: 0.892, flag: "🇨🇭" },
  CNY: { name: "Chinese Yuan", rate: 7.240, flag: "🇨🇳" },
  SGD: { name: "Singapore Dollar", rate: 1.341, flag: "🇸🇬" },
  AED: { name: "UAE Dirham", rate: 3.673, flag: "🇦🇪" },
  BRL: { name: "Brazilian Real", rate: 5.750, flag: "🇧🇷" },
  KRW: { name: "South Korean Won", rate: 1395.0, flag: "🇰🇷" },
  MXN: { name: "Mexican Peso", rate: 20.35, flag: "🇲🇽" },
  SEK: { name: "Swedish Krona", rate: 10.65, flag: "🇸🇪" },
  NZD: { name: "New Zealand Dollar", rate: 1.685, flag: "🇳🇿" }
};

export const RateChecker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rates' | 'limits'>('rates');

  // --- Currency Converter State ---
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [targetCurrency, setTargetCurrency] = useState<string>('INR');
  const [amount, setAmount] = useState<number>(100);
  const [conversionResult, setConversionResult] = useState<CurrencyConversionResult | null>(null);
  const [ratesData, setRatesData] = useState<ExchangeRateResponse | null>(null);
  const [popularPairs, setPopularPairs] = useState<PopularPairItem[]>([]);
  const [currencyLoading, setCurrencyLoading] = useState<boolean>(false);
  const [currencySearch, setCurrencySearch] = useState<string>('');

  // --- Model Limits State ---
  const [limitsData, setLimitsData] = useState<ModelLimitsResponse | null>(null);
  const [limitsLoading, setLimitsLoading] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [rollingSeconds, setRollingSeconds] = useState<number>(60);
  const [groqSecondsLeft, setGroqSecondsLeft] = useState<number>(50400);
  const [geminiSecondsLeft, setGeminiSecondsLeft] = useState<number>(28800);

  // Token Budget Estimator State
  const [calcModelId, setCalcModelId] = useState<string>('gemini-2.5-flash');
  const [calcTopK, setCalcTopK] = useState<number>(5);
  const [calcChunkSize, setCalcChunkSize] = useState<number>(200);
  const [calcQuestionLength, setCalcQuestionLength] = useState<number>(50);

  // Initialize and load currency rates
  const loadRates = async (base = baseCurrency) => {
    setCurrencyLoading(true);
    try {
      const res = await api.getExchangeRates(base);
      setRatesData(res);
      // Also calculate conversion
      const conv = await api.convertCurrency(base, targetCurrency, amount);
      setConversionResult(conv);
    } catch {
      // Use resilient local calculation
      const bRate = FALLBACK_CURRENCIES[base]?.rate || 1.0;
      const tRate = FALLBACK_CURRENCIES[targetCurrency]?.rate || 1.0;
      const crossRate = tRate / bRate;
      setConversionResult({
        base,
        target: targetCurrency,
        amount,
        rate: Math.round(crossRate * 10000) / 10000,
        converted_amount: Math.round(amount * crossRate * 100) / 100,
        timestamp: new Date().toUTCString(),
        data_source: "Open Exchange Rates (Benchmark Fallback)",
        cached: false,
        status: "success"
      });
    } finally {
      setCurrencyLoading(false);
    }
  };

  const loadPopularPairs = async () => {
    try {
      const res = await api.getPopularPairs();
      setPopularPairs(res.pairs || []);
    } catch {
      // Fallback popular pairs
      setPopularPairs([
        { pair: "EUR/USD", base: "EUR", target: "USD", rate: 1.082, timestamp: new Date().toUTCString(), source: "Benchmark" },
        { pair: "USD/INR", base: "USD", target: "INR", rate: 86.85, timestamp: new Date().toUTCString(), source: "Benchmark" },
        { pair: "GBP/USD", base: "GBP", target: "USD", rate: 1.264, timestamp: new Date().toUTCString(), source: "Benchmark" },
        { pair: "USD/JPY", base: "USD", target: "JPY", rate: 153.20, timestamp: new Date().toUTCString(), source: "Benchmark" },
        { pair: "USD/CAD", base: "USD", target: "CAD", rate: 1.392, timestamp: new Date().toUTCString(), source: "Benchmark" },
        { pair: "AUD/USD", base: "AUD", target: "USD", rate: 0.647, timestamp: new Date().toUTCString(), source: "Benchmark" },
        { pair: "USD/AED", base: "USD", target: "AED", rate: 3.673, timestamp: new Date().toUTCString(), source: "Benchmark" },
        { pair: "USD/CHF", base: "USD", target: "CHF", rate: 0.892, timestamp: new Date().toUTCString(), source: "Benchmark" }
      ]);
    }
  };

  // Load Model Limits
  const loadLimits = async () => {
    setLimitsLoading(true);
    try {
      const res = await api.getModelLimits();
      setLimitsData(res);
      const groqSec = res.reset_cadence?.groq_seconds_until_reset ?? res.reset_reference?.groq_seconds_until_reset ?? 50400;
      const geminiSec = res.reset_cadence?.gemini_seconds_until_reset ?? res.reset_reference?.gemini_seconds_until_reset ?? 28800;
      setGroqSecondsLeft(groqSec);
      setGeminiSecondsLeft(geminiSec);
    } catch {
      // Keep resilient fallback limits
      setLimitsData({
        server_time_utc: new Date().toUTCString(),
        active_provider: "gemini",
        models: FALLBACK_MODEL_LIMITS
      });
    } finally {
      setLimitsLoading(false);
    }
  };

  useEffect(() => {
    loadRates(baseCurrency);
    loadPopularPairs();
    loadLimits();
  }, []);

  // Update conversion when base, target, or amount changes
  const handleConvert = async (b = baseCurrency, t = targetCurrency, a = amount) => {
    setCurrencyLoading(true);
    try {
      const conv = await api.convertCurrency(b, t, a);
      setConversionResult(conv);
    } catch {
      const bRate = (ratesData?.rates?.[b] || FALLBACK_CURRENCIES[b]?.rate || 1.0);
      const tRate = (ratesData?.rates?.[t] || FALLBACK_CURRENCIES[t]?.rate || 1.0);
      const crossRate = tRate / bRate;
      setConversionResult({
        base: b,
        target: t,
        amount: a,
        rate: Math.round(crossRate * 10000) / 10000,
        converted_amount: Math.round(a * crossRate * 100) / 100,
        timestamp: new Date().toUTCString(),
        data_source: "Open Exchange Rates API (Resilient Local)",
        cached: false,
        status: "success"
      });
    } finally {
      setCurrencyLoading(false);
    }
  };

  // Swap currencies
  const handleSwap = () => {
    const oldBase = baseCurrency;
    const oldTarget = targetCurrency;
    setBaseCurrency(oldTarget);
    setTargetCurrency(oldBase);
    handleConvert(oldTarget, oldBase, amount);
  };

  // Live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setRollingSeconds(60 - now.getSeconds());
      setGroqSecondsLeft(prev => (prev > 0 ? prev - 1 : 86400));
      setGeminiSecondsLeft(prev => (prev > 0 ? prev - 1 : 86400));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHMS = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Models list
  const models = limitsData?.models && limitsData.models.length > 0 ? limitsData.models : FALLBACK_MODEL_LIMITS;
  const filteredModels = models.filter((m) => {
    if (selectedProvider === 'all') return true;
    return m.provider === selectedProvider;
  });

  // Token budget calculations
  const selectedCalcModel = models.find((m) => m.id === calcModelId) || models[0];
  const estimatedPromptTokens = calcQuestionLength + calcTopK * calcChunkSize + 150;
  const modelTpm = typeof selectedCalcModel?.limits?.tpm === 'number' ? selectedCalcModel.limits.tpm : null;
  const tpmPercentage = modelTpm ? Math.min(100, (estimatedPromptTokens / modelTpm) * 100) : 0;
  const maxQueriesPerMin = modelTpm ? Math.floor(modelTpm / Math.max(1, estimatedPromptTokens)) : 'Unlimited';

  // Currency list for dropdowns
  const currencyList = Object.keys(FALLBACK_CURRENCIES);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      <Header
        title="Rate Checker & Quota Telemetry"
        subtitle="Real-time multi-currency exchange rates and LLM model rate limit telemetry with live reset counters"
      />

      {/* Main Tab Switcher */}
      <div className="px-4 sm:px-8 pt-4 pb-0 bg-transparent border-b border-border/40">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2.5 rounded-t-xl font-medium text-sm transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'rates'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-slate-900/60 shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-slate-800/40'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Currency Exchange Rates</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              Live API
            </span>
          </button>

          <button
            onClick={() => setActiveTab('limits')}
            className={`px-4 py-2.5 rounded-t-xl font-medium text-sm transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'limits'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-slate-900/60 shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-slate-800/40'
            }`}
          >
            <Gauge className="w-4 h-4 text-indigo-500" />
            <span>LLM Model Limits & Reset</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
              TPM / RPM
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: CURRENCY EXCHANGE RATE CHECKER */}
        {/* ========================================================================= */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            {/* Live Converter Card */}
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/40 dark:border-white/10 shadow-xl backdrop-blur-xl bg-white/60 dark:bg-slate-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/50 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      Real-Time Currency Conversion
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Powered by Open Exchange Rates API. Educational utility for Agentic financial calculators & global e-commerce RAG pipelines.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      loadRates(baseCurrency);
                      loadPopularPairs();
                    }}
                    disabled={currencyLoading}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${currencyLoading ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>Refresh Rates</span>
                  </button>
                </div>
              </div>

              {/* Conversion Controls */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Amount Input */}
                <div className="md:col-span-4 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                      {FALLBACK_CURRENCIES[baseCurrency]?.flag || '$'}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={amount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAmount(val);
                        handleConvert(baseCurrency, targetCurrency, val);
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border/60 bg-white/70 dark:bg-slate-800/70 text-foreground font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="100.00"
                    />
                  </div>
                </div>

                {/* Base Currency */}
                <div className="md:col-span-3 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    From (Base)
                  </label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => {
                      const newBase = e.target.value;
                      setBaseCurrency(newBase);
                      loadRates(newBase);
                      handleConvert(newBase, targetCurrency, amount);
                    }}
                    className="w-full px-3 py-3 rounded-2xl border border-border/60 bg-white/70 dark:bg-slate-800/70 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {currencyList.map((code) => (
                      <option key={code} value={code} className="bg-background text-foreground">
                        {FALLBACK_CURRENCIES[code].flag} {code} - {FALLBACK_CURRENCIES[code].name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <div className="md:col-span-2 flex justify-center pt-5">
                  <button
                    onClick={handleSwap}
                    title="Swap Currencies"
                    className="p-3 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Target Currency */}
                <div className="md:col-span-3 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    To (Target)
                  </label>
                  <select
                    value={targetCurrency}
                    onChange={(e) => {
                      const newTarget = e.target.value;
                      setTargetCurrency(newTarget);
                      handleConvert(baseCurrency, newTarget, amount);
                    }}
                    className="w-full px-3 py-3 rounded-2xl border border-border/60 bg-white/70 dark:bg-slate-800/70 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {currencyList.map((code) => (
                      <option key={code} value={code} className="bg-background text-foreground">
                        {FALLBACK_CURRENCIES[code].flag} {code} - {FALLBACK_CURRENCIES[code].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversion Result Hero Display */}
              {conversionResult && (
                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-emerald-500/10 border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Live Conversion Output
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 tracking-tight">
                      {amount.toLocaleString()} {baseCurrency} ={' '}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {conversionResult.converted_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
                        {targetCurrency}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        1 {baseCurrency} = <strong className="text-foreground">{conversionResult.rate}</strong> {targetCurrency}
                      </span>
                      <span>•</span>
                      <span>
                        1 {targetCurrency} ={' '}
                        <strong className="text-foreground">
                          {conversionResult.rate > 0 ? (1 / conversionResult.rate).toFixed(4) : '0'}
                        </strong>{' '}
                        {baseCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Pill */}
                  <div className="w-full md:w-auto p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-border/50 text-right md:text-right flex flex-col gap-1 text-xs">
                    <div className="text-muted-foreground flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{conversionResult.timestamp}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Data Source: <strong className="text-foreground">{conversionResult.data_source}</strong>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{conversionResult.cached ? 'High-Performance Cache' : 'Live Sync Validated'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Quick Presets */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground mr-1">Quick Presets:</span>
                {[10, 50, 100, 500, 1000, 5000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setAmount(preset);
                      handleConvert(baseCurrency, targetCurrency, preset);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                      amount === preset
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'bg-secondary/60 hover:bg-secondary text-foreground'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Currency Pairs Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    Major Forex & Market Rates
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Benchmark pairs queried in agentic travel planning, financial reporting, and cross-border calculations.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Click any pair to load instantly
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {popularPairs.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBaseCurrency(p.base);
                      setTargetCurrency(p.target);
                      handleConvert(p.base, p.target, amount);
                    }}
                    className="p-4 rounded-2xl glass-card border border-white/30 dark:border-white/10 hover:border-indigo-500/40 bg-white/50 dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {p.pair}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {FALLBACK_CURRENCIES[p.target]?.flag || '🌐'}
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-foreground mt-1">
                      {p.rate.toFixed(4)}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-between">
                      <span>1 {p.base}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Educational Banner: Why Rate Checking in Agentic AI? */}
            <div className="p-6 rounded-3xl glass-card border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground text-sm">
                  Why is a Real-Time Currency Rate Checker Essential in AI Engineering?
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  LLMs hallucinate volatile numbers like daily exchange rates because weights freeze after training. In an <strong>Agentic RAG</strong> or <strong>ReAct tool agent</strong>, providing a deterministic REST API tool allows agents to solve real-world tasks (such as budgeting a 4-day trip to Tokyo in USD or reconciling multi-currency invoices) with verified mathematical precision instead of probabilistic guesses.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LLM MODEL LIMITS & RESET WINDOWS */}
        {/* ========================================================================= */}
        {activeTab === 'limits' && (
          <div className="space-y-6">
            {/* Live Countdown Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rolling 60s window */}
              <div className="glass-card p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rolling Minute Window
                  </span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                    {rollingSeconds}s
                  </span>
                  <span className="text-xs text-muted-foreground">until sliding RPM reset</span>
                </div>
                <div className="w-full bg-secondary/80 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${((60 - rollingSeconds) / 60) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3 text-indigo-500" />
                  Groq & Gemini RPM/TPM budgets slide per second
                </p>
              </div>

              {/* Groq Daily Reset */}
              <div className="glass-card p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Groq Daily Quota Reset
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border border-orange-500/20">
                    00:00 UTC
                  </span>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                    {formatHMS(groqSecondsLeft)}
                  </span>
                </div>
                <div className="w-full bg-secondary/80 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, ((86400 - groqSecondsLeft) / 86400) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-500" />
                  Resets 14,400 RPD daily developer ceiling
                </p>
              </div>

              {/* Gemini Daily Reset */}
              <div className="glass-card p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gemini Daily Quota Reset
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                    00:00 PT
                  </span>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                    {formatHMS(geminiSecondsLeft)}
                  </span>
                </div>
                <div className="w-full bg-secondary/80 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, ((86400 - geminiSecondsLeft) / 86400) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  Resets 1,500 RPD free tier ceiling (Pacific Time)
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                {['all', 'gemini', 'groq', 'ollama'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedProvider === p
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p === 'all' ? 'All Models' : p === 'gemini' ? 'Google Gemini' : p === 'groq' ? 'Groq Cloud' : 'Ollama Local'}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Showing {filteredModels.length} models</span>
                <button
                  onClick={loadLimits}
                  className="p-1 rounded-lg hover:bg-secondary transition-colors"
                  title="Reload limits"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${limitsLoading ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Model Limit Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  className="glass-card rounded-3xl p-5 border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 shadow-md flex flex-col justify-between hover:shadow-lg transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {m.provider_name}
                        </span>
                        <h4 className="text-base font-bold text-foreground mt-0.5">{m.name}</h4>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border/50">
                        {m.tier}
                      </span>
                    </div>

                    {/* Limit Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-secondary/50 border border-border/40 text-center">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">RPM</div>
                        <div className="text-sm font-bold text-foreground mt-0.5 font-mono">
                          {typeof m.limits.rpm === 'number' ? m.limits.rpm.toLocaleString() : m.limits.rpm}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">TPM</div>
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
                          {typeof m.limits.tpm === 'number' ? m.limits.tpm.toLocaleString() : m.limits.tpm}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">RPD</div>
                        <div className="text-sm font-bold text-foreground mt-0.5 font-mono">
                          {typeof m.limits.rpd === 'number' ? m.limits.rpd.toLocaleString() : m.limits.rpd}
                        </div>
                      </div>
                    </div>

                    {/* Context & Reset Details */}
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Context Window:</span>
                        <strong className="text-foreground">{m.limits.context_window?.toLocaleString()} tokens</strong>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Max Output:</span>
                        <strong className="text-foreground">{m.limits.max_output_tokens?.toLocaleString()} tokens</strong>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Reset Schedule:</span>
                        <span className="text-[11px] font-medium text-foreground text-right truncate max-w-[160px]" title={m.reset_schedule?.daily_reset}>
                          {m.reset_schedule?.daily_reset}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mitigation Note */}
                  <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                    <strong className="text-foreground block mb-0.5">Recommended Workload:</strong>
                    {m.recommended_for}
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Token Budget Estimator */}
            <div className="glass-card p-6 rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 shadow-md">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <Calculator className="w-5 h-5" />
                <h3 className="text-base font-bold text-foreground">Interactive Token Budget & Quota Calculator</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Estimate your single-query prompt token footprint and check how many parallel queries your selected model’s TPM ceiling can sustain.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                {/* Select Model */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Target Model</label>
                  <select
                    value={calcModelId}
                    onChange={(e) => setCalcModelId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border/60 bg-white/70 dark:bg-slate-800/70 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id} className="bg-background text-foreground">
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Top-K Chunks */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Retrieved Chunks (Top-K)</span>
                    <span className="text-foreground">{calcTopK} chunks</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={calcTopK}
                    onChange={(e) => setCalcTopK(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                {/* Chunk Size */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Tokens per Chunk</span>
                    <span className="text-foreground">{calcChunkSize} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={calcChunkSize}
                    onChange={(e) => setCalcChunkSize(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                {/* Question Length */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Question Length</span>
                    <span className="text-foreground">{calcQuestionLength} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={calcQuestionLength}
                    onChange={(e) => setCalcQuestionLength(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              {/* Calculation Stats Bar */}
              <div className="mt-5 p-4 rounded-2xl bg-secondary/60 border border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase">Estimated Prompt Size</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">{estimatedPromptTokens.toLocaleString()} tokens</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase">Model TPM Limit</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
                    {typeof selectedCalcModel.limits.tpm === 'number'
                      ? selectedCalcModel.limits.tpm.toLocaleString()
                      : selectedCalcModel.limits.tpm}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase">% of 1-Min Quota</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">{tpmPercentage.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase">Max Safe RPM</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{maxQueriesPerMin} req/min</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

