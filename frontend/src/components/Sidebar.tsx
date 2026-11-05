import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Bot,
  Cpu,
  Layers,
  FileText,
  Settings,
  GraduationCap,
  Sparkles,
  Database,
  Gauge,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/rag-explorer', label: 'RAG Explorer', icon: Search, badge: 'Pipeline' },
  { path: '/agent-studio', label: 'AI Agent Studio', icon: Bot, badge: 'Tools' },
  { path: '/agentic-rag-studio', label: 'Agentic RAG Studio', icon: Cpu, badge: 'Iterative' },
  { path: '/chunk-lab', label: 'Chunk Size Laboratory', icon: Layers, badge: 'Lab' },
  { path: '/pdf-library', label: 'PDF Library', icon: FileText },
  { path: '/learning-centre', label: 'Learning Centre', icon: GraduationCap },
  { path: '/rate-checker', label: 'Rate Checker', icon: Gauge, badge: 'Live Rates' },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { mobileMenuOpen, closeMobileMenu } = useTheme();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white/80 dark:bg-[#0B0D15]/90 lg:bg-white/60 lg:dark:bg-[#0B0D15]/60 backdrop-blur-2xl border-r border-white/60 dark:border-white/[0.08] flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/40 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 flex items-center justify-center shadow-md shadow-stone-900/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-[15px] tracking-tight text-slate-900 dark:text-white leading-tight">
                AI Learning Lab
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-normal mt-0.5">
                RAG • Agents • Benchmarks
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={closeMobileMenu}
            className="lg:hidden p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-display">
            Learning Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-white/90 dark:bg-white/[0.12] text-slate-950 dark:text-white border border-white dark:border-white/20 shadow-[0_4px_16px_rgba(31,38,135,0.06)] dark:shadow-none backdrop-blur-md'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.05]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Persistent System Info Footer */}
        <div className="p-4 m-3 rounded-2xl liquid-glass-subtle">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              FAISS Vector Store
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            bge-small-en-v1.5 (384d)
          </p>
        </div>
      </aside>
    </>
  );
};
