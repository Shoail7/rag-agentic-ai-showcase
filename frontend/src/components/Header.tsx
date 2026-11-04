import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, BookOpen, CheckCircle, RefreshCw, Gauge } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { AppSettings } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onSampleLoaded?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onSampleLoaded }) => {
  const { theme, toggleTheme } = useTheme();
  const [settingsData, setSettingsData] = useState<AppSettings | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettingsData).catch(() => {});
  }, []);

  const handleLoadSamples = async () => {
    try {
      setLoadingSample(true);
      await api.loadSampleDocuments();
      setSampleSuccess(true);
      setTimeout(() => setSampleSuccess(false), 3000);
      if (onSampleLoaded) onSampleLoaded();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSample(false);
    }
  };

  const activeProvider = settingsData?.active_provider || 'gemini';
  const providerInfo = settingsData?.providers[activeProvider];

  return (
    <header className="h-20 bg-white/50 dark:bg-[#0B0D15]/50 backdrop-blur-2xl border-b border-white/60 dark:border-white/[0.08] px-8 flex items-center justify-between shrink-0 transition-colors duration-300">
      <div>
        <h1 className="text-lg font-display font-medium text-slate-900 dark:text-white tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Sample Handbooks Loader */}
        <button
          onClick={handleLoadSamples}
          disabled={loadingSample}
          className="btn-frosted-pill flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer transition-all disabled:opacity-50"
          title="Load Nexora Handbooks (2024 & 2025) into library"
        >
          {loadingSample ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-slate-300" />
          ) : sampleSuccess ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          )}
          <span>{sampleSuccess ? 'Handbooks Loaded!' : 'Load Sample Handbooks'}</span>
        </button>

        {/* Active Provider Tag & Limit Link */}
        <Link
          to="/limit-check"
          title="Click to view model quotas, RPM/TPM limits and reset countdowns"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 dark:bg-white/[0.05] hover:bg-white/80 dark:hover:bg-white/[0.1] border border-white/80 dark:border-white/10 shadow-xs backdrop-blur-md transition-all group cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] group-hover:scale-125 transition-transform" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
            {activeProvider}
          </span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
            {providerInfo?.model || 'flash'}
          </span>
          <Gauge className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ml-0.5" />
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2.5 rounded-full bg-white/70 hover:bg-white dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200 border border-white/80 dark:border-white/10 transition-all cursor-pointer shadow-xs backdrop-blur-md hover:scale-105 active:scale-95"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};
