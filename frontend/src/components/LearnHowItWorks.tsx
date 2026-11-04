import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Lightbulb } from 'lucide-react';

interface LearnItem {
  title: string;
  summary: string;
  details: string;
  bulletPoints?: string[];
}

interface LearnHowItWorksProps {
  moduleName: string;
  items: LearnItem[];
}

export const LearnHowItWorks: React.FC<LearnHowItWorksProps> = ({ moduleName, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="mb-6 liquid-glass rounded-3xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white group-hover:scale-105 transition-transform">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display text-slate-900 dark:text-white uppercase tracking-wider">
              Educational Architecture Guide: {moduleName}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              Click to inspect technical concepts, token boundaries, and algorithmic mechanics.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-full">
          <span>{isOpen ? 'Hide Guide' : 'Explore Concept'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-black/5 dark:border-white/5 p-6 bg-white/40 dark:bg-black/20 backdrop-blur-md">
          {/* Concept Tabs as Frosted Pills */}
          <div className="flex flex-wrap gap-2 mb-5 border-b border-black/5 dark:border-white/5 pb-4">
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeTab === idx
                    ? 'btn-liquid-pill shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* Active Concept Body */}
          {items[activeTab] && (
            <div className="space-y-3.5">
              <h4 className="text-sm font-display font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                {items[activeTab].title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {items[activeTab].summary}
              </p>
              <div className="p-4 rounded-2xl liquid-glass-subtle text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
                <p className="whitespace-pre-line leading-relaxed">{items[activeTab].details}</p>
                {items[activeTab].bulletPoints && (
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {items[activeTab].bulletPoints.map((bp, bIdx) => (
                      <li key={bIdx}>{bp}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
