import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Key,
  Cpu,
  CheckCircle,
  Shield,
  RefreshCw,
  Database,
  Gauge,
  ChevronRight
} from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../services/api';
import { AppSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<AppSettings | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>('gemini');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.5-flash');
  const [groqModel, setGroqModel] = useState<string>('llama-3.3-70b-versatile');
  const [ollamaModel, setOllamaModel] = useState<string>('llama3.2');
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://localhost:11434');

  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');
  const [groqKeyInput, setGroqKeyInput] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettingsData(data);
      setActiveProvider(data.active_provider);
      setGeminiModel(data.providers.gemini?.model || 'gemini-2.5-flash');
      setGroqModel(data.providers.groq?.model || 'llama-3.3-70b-versatile');
      setOllamaModel(data.providers.ollama?.model || 'llama3.2');
      if (data.providers.ollama?.base_url) {
        setOllamaUrl(data.providers.ollama.base_url);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkHealth = async () => {
    try {
      const h = await api.getHealth();
      setHealthStatus(h);
    } catch (e) {
      setHealthStatus({ status: 'error' });
    }
  };

  useEffect(() => {
    loadSettings();
    checkHealth();
  }, []);

  const handleSaveProvider = async () => {
    try {
      setSaving(true);
      await api.updateProvider({
        provider: activeProvider,
        gemini_model: geminiModel,
        groq_model: groqModel,
        ollama_model: ollamaModel,
        ollama_url: ollamaUrl,
      });

      // Save keys if user entered new ones
      if (geminiKeyInput.trim() || groqKeyInput.trim()) {
        await api.updateApiKeys({
          gemini_api_key: geminiKeyInput.trim() || undefined,
          groq_api_key: groqKeyInput.trim() || undefined,
        });
        setGeminiKeyInput('');
        setGroqKeyInput('');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettings();
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="Settings & System Configuration"
        subtitle="Manage LLM providers, model identifiers, API keys, and local embeddings"
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-5xl">
        {/* Rate Limits Quota Banner */}
        <div className="liquid-glass p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
                Model Rate Limits, TPM & Reset Schedules
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitor free-tier quotas, rolling 60-second windows, and daily UTC/PT reset countdowns.
              </p>
            </div>
          </div>
          <Link
            to="/limit-check"
            className="btn-liquid-pill px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-950 flex items-center gap-1.5 shrink-0"
          >
            <span>Open Limit Check</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-4 rounded-3xl liquid-glass text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">Settings and keys saved securely in backend storage!</span>
          </div>
        )}

        {/* LLM Provider Selection Card */}
        <div className="liquid-glass rounded-3xl p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              Active LLM Provider Selection
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Provider Abstraction Layer Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1: Gemini */}
            <div
              onClick={() => setActiveProvider('gemini')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                activeProvider === 'gemini'
                  ? 'border-slate-900 bg-white/90 dark:border-white dark:bg-white/[0.12] shadow-md scale-[1.02]'
                  : 'liquid-glass-subtle hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-bold text-slate-900 dark:text-white">Google Gemini</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3 font-normal">
                Free-tier Flash models via Google GenAI SDK.
              </p>
              <div className="text-[10px] font-mono text-slate-400">
                Key status: {settingsData?.providers?.gemini?.has_key ? '✓ Configured' : 'Missing (Runs Fallback)'}
              </div>
            </div>

            {/* Option 2: Groq */}
            <div
              onClick={() => setActiveProvider('groq')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                activeProvider === 'groq'
                  ? 'border-slate-900 bg-white/90 dark:border-white dark:bg-white/[0.12] shadow-md scale-[1.02]'
                  : 'liquid-glass-subtle hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-bold text-slate-900 dark:text-white">Groq Cloud</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  Fast Free Tier
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3 font-normal">
                Ultra-fast inference with Llama 3 models on Groq LPU.
              </p>
              <div className="text-[10px] font-mono text-slate-400">
                Key status: {settingsData?.providers?.groq?.has_key ? '✓ Configured' : 'Missing (Runs Fallback)'}
              </div>
            </div>

            {/* Option 3: Ollama */}
            <div
              onClick={() => setActiveProvider('ollama')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                activeProvider === 'ollama'
                  ? 'border-slate-900 bg-white/90 dark:border-white dark:bg-white/[0.12] shadow-md scale-[1.02]'
                  : 'liquid-glass-subtle hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display font-bold text-slate-900 dark:text-white">Ollama Local</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  100% Offline
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3 font-normal">
                Run local models like Llama 3.2 without sending data online.
              </p>
              <div className="text-[10px] font-mono text-slate-400">
                Requires Ollama running on localhost:11434
              </div>
            </div>
          </div>

          {/* Model Config Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
            <div>
              <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Gemini Model Identifier
              </label>
              <input
                type="text"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                placeholder="gemini-2.5-flash"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Free tier: gemini-2.5-flash, gemini-1.5-flash</span>
            </div>

            <div>
              <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Groq Model Identifier
              </label>
              <input
                type="text"
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                placeholder="llama-3.3-70b-versatile"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Free tier: llama-3.3-70b-versatile, llama-3.1-8b-instant</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Ollama Server Endpoint & Model
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white outline-hidden"
              />
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="llama3.2"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* API Key Management (Never Exposed in Browser Responses) */}
        <div className="liquid-glass rounded-3xl p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              API Key Management (Secure Backend Storage)
            </h3>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <Shield className="w-3.5 h-3.5" />
              Masked on Read • Never Transmitted in Clear
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder={settingsData?.providers?.gemini?.key_preview || 'AIzaSy...'}
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Leave empty to retain existing key.
              </span>
            </div>

            <div>
              <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Groq API Key
              </label>
              <input
                type="password"
                value={groqKeyInput}
                onChange={(e) => setGroqKeyInput(e.target.value)}
                placeholder={settingsData?.providers?.groq?.key_preview || 'gsk_...'}
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Leave empty to retain existing key.
              </span>
            </div>
          </div>

          <button
            onClick={handleSaveProvider}
            disabled={saving}
            className="w-full py-3.5 btn-liquid-pill text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            {saving ? 'Saving Changes...' : 'Save Settings & Update Providers'}
          </button>
        </div>

        {/* Local Embedding & Vector DB Status */}
        <div className="liquid-glass rounded-3xl p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Local Infrastructure & Storage Status
            </h3>
            <button
              onClick={checkHealth}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verify Health</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-1">
              <span className="font-display font-bold text-slate-700 dark:text-slate-300 block">Embedding Model</span>
              <span className="font-mono text-slate-900 dark:text-white text-[11px] block font-semibold">BAAI/bge-small-en-v1.5</span>
              <span className="text-[10px] text-slate-400">384 Dimensions • Local CPU</span>
            </div>

            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-1">
              <span className="font-display font-bold text-slate-700 dark:text-slate-300 block">Vector Storage</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px] block font-semibold">ChromaDB Persistent</span>
              <span className="text-[10px] text-slate-400">Local Directory (Separate from PDFs)</span>
            </div>

            <div className="p-4 rounded-2xl liquid-glass-subtle space-y-1">
              <span className="font-display font-bold text-slate-700 dark:text-slate-300 block">Application Database</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px] block font-semibold">SQLite WAL Mode</span>
              <span className="text-[10px] text-slate-400">High concurrency local storage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
