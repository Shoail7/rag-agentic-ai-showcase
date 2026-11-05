import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, BookOpen, CheckCircle, RefreshCw, Gauge, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { AppSettings } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onSampleLoaded?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onSampleLoaded }) => {
  const { theme, toggleTheme, mobileMenuOpen, toggleMobileMenu } = useTheme();
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
    <header className="h-20 bg-white/50 dark:bg-[#0B0D15]/50 backdrop-blur-2xl border-b border-white/60 dark:border-white/[0.08] px-4 sm:px-8 flex items-center justify-between shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-xl bg-white/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 border border-white/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/20 transition-all"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-display font-medium text-slate-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 hidden sm:block truncate max-w-md">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Sample Handbooks Loader */}
        <button
          onClick={handleLoadSamples}
          disabled={loadingSample}
          className="btn-frosted-pill flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-medium cursor-pointer transition-all disabled:opacity-50"
          title="Load Nexora Handbooks (2024 & 2025) into library"
        >
          {loadingSample ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-slate-300" />
          ) : sampleSuccess ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          )}
          <span className="hidden sm:inline">{sampleSuccess ? 'Handbooks Loaded!' : 'Load Sample Handbooks'}</span>
          <span className="sm:hidden">{sampleSuccess ? 'Loaded' : 'Samples'}</span>
        </button>

        {/* Active Provider Tag & Rate Checker Link */}
        <Link
          to="/rate-checker"
          title="Click to view live currency exchange rates, model quotas, RPM/TPM limits and reset countdowns"
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white/60 dark:bg-white/[0.05] hover:bg-white/80 dark:hover:bg-white/[0.1] border border-white/80 dark:border-white/10 shadow-xs backdrop-blur-md transition-all group cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] group-hover:scale-125 transition-transform shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize hidden xs:inline">
            {activeProvider}
          </span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-black/5 dark:bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full truncate max-w-[80px]">
            {providerInfo?.model || 'flash'}
          </span>
          <Gauge className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ml-0.5 shrink-0" />
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 sm:p-2.5 rounded-full bg-white/70 hover:bg-white dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200 border border-white/80 dark:border-white/10 transition-all cursor-pointer shadow-xs backdrop-blur-md hover:scale-105 active:scale-95 shrink-0"
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
