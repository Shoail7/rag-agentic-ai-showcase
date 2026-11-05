import React, { useState } from 'react';
import {
  Bot,
  Play,
  Square,
  Wrench,
  Clock,
  CheckCircle,
  Calculator,
  Calendar,
  Compass,
  FileSpreadsheet,
  AlignLeft,
  Sparkles,
  CloudSun
} from 'lucide-react';
import { Header } from '../components/Header';
import { LearnHowItWorks } from '../components/LearnHowItWorks';
import { api } from '../services/api';
import { AgentRunResponse } from '../types';

export const AiAgentStudio: React.FC = () => {
  const [goal, setGoal] = useState<string>('Plan a two-day Goa trip under ₹10,000.');
  const [loading, setLoading] = useState(false);
  const [agentRun, setAgentRun] = useState<AgentRunResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'sandbox'>('timeline');

  // Sandbox state
  const [calcExpr, setCalcExpr] = useState('4500 + 1800 + (700 * 2)');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [dateDays, setDateDays] = useState(30);
  const [dateResult, setDateResult] = useState<any>(null);
  const [travelDest, setTravelDest] = useState('Goa');
  const [travelResult, setTravelResult] = useState<any>(null);
  const [weatherLoc, setWeatherLoc] = useState('Tokyo');
  const [weatherResult, setWeatherResult] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [csvContent, setCsvContent] = useState('Item,Cost\nHotel,4200\nFlight,6500\nMeals,1800');
  const [csvResult, setCsvResult] = useState<any>(null);
  const [textInput, setTextInput] = useState('Antigravity RAG agents use reasoning loops to plan, select tools, and verify observations.');
  const [textResult, setTextResult] = useState<any>(null);

  const handleRunAgent = async () => {
    if (!goal.trim()) return;
    try {
      setLoading(true);
      const res = await api.runAgent(goal);
      setAgentRun(res);
      setActiveTab('timeline');
    } catch (e: any) {
      alert(`Agent execution failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopAgent = async () => {
    if (agentRun) {
      await api.runAgent(goal);
      alert('Execution stopped by user.');
    }
  };

  const presetGoals = [
    "Plan a two-day Goa trip under ₹10,000.",
    "What is the current weather forecast in Tokyo right now?",
    "Calculate 18% GST on a laptop purchase of ₹65,000 + ₹2,400 shipping",
    "Calculate the project deadline 45 calendar days from today",
    "Analyze departmental expense dataset and calculate average spend",
    "Extract key phrases and word count for this AI policy"
  ];

  const learnItems = [
    {
      title: "1. What is an AI Agent?",
      summary: "An autonomous entity powered by an LLM that can perceive its goal, form a multi-step plan, execute tools, observe feedback, and iterate until the task is complete.",
      details: "Unlike standard LLMs that only generate passive text responses, agents actively interact with external environments (calculators, search APIs, databases) using tools."
    },
    {
      title: "2. The Agent Loop: THINK → ACT → OBSERVE",
      summary: "The foundational cognitive cycle that drives iterative problem-solving in modern agent architectures.",
      details: "• THINK: The agent assesses the current state, analyzes what information is still missing, and selects an action.\n• ACT: The agent executes a tool with concrete parameters.\n• OBSERVE: The agent inspects the tool output and assimilates the result into working memory.\n• REPEAT: Cycles until the goal is fully achieved."
    },
    {
      title: "3. Tool Calling & Safe Execution",
      summary: "Restricting agents to structured, validated function interfaces rather than arbitrary code execution.",
      details: "Agents must never be granted unrestricted shell or Python access. Safety bounds include maximum execution steps (e.g. 10 steps), strict argument validation, and deterministic output evaluation."
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="AI Agent Studio"
        subtitle="Multi-step autonomous agent reasoning, tool execution, and observable timeline"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        <LearnHowItWorks moduleName="Autonomous AI Agents & Tool Calling" items={learnItems} />

        {/* Goal Input & Controls Bar */}
        <div className="liquid-glass rounded-3xl p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-800 dark:text-white">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Agent Goal & Task Specification
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                Safety Bounds: Max 10 Steps
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Give the agent a complex goal (e.g., Plan a two-day Goa trip under ₹10,000)..."
              className="flex-1 px-4 py-3 rounded-2xl liquid-glass-subtle text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 outline-hidden transition-all"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAgent}
                disabled={loading}
                className="px-6 py-3 btn-liquid-pill text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                    <span>Executing Plan...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Agent</span>
                  </>
                )}
              </button>

              {loading && (
                <button
                  onClick={handleStopAgent}
                  className="px-4 py-3 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>

          {/* Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
              Sample Goals:
            </span>
            {presetGoals.map((g, idx) => (
              <button
                key={idx}
                onClick={() => setGoal(g)}
                className="text-[11px] px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer truncate max-w-xs font-medium"
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Toggle: Execution Timeline vs Interactive Tool Sandbox */}
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 px-4 text-xs font-display font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-slate-900 text-slate-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Live Execution Timeline & Reasoning
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`pb-3 px-4 text-xs font-display font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'border-slate-900 text-slate-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Individual Tool Sandbox (5 Tools)
          </button>
        </div>

        {/* VIEW 1: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* Run summary badge if completed */}
            {agentRun && (
              <div className="p-4 rounded-3xl liquid-glass flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-display font-bold text-slate-900 dark:text-white block">
                      Execution Complete in {agentRun.execution_duration_sec}s
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                      Total Steps: {agentRun.total_steps} • Status: {agentRun.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Steps List */}
            {!agentRun ? (
              <div className="p-16 text-center rounded-3xl liquid-glass text-slate-400">
                <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <h4 className="text-sm font-display font-medium text-slate-700 dark:text-slate-300">
                  No Active Agent Run
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Click "Run Agent" above to watch the agent decompose the goal into actions and tools.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {agentRun.steps.map((step, idx) => {
                  const isAction = step.action_type === 'ACT';
                  const isFinal = step.action_type === 'FINAL_ANSWER';
                  const isThink = step.action_type === 'THINK';
                  const isObserve = step.action_type === 'OBSERVE';

                  return (
                    <div
                      key={idx}
                      className="p-6 rounded-3xl liquid-glass transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full font-mono ${
                            isFinal ? 'bg-emerald-600 text-white' :
                            isAction ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' :
                            isObserve ? 'bg-sky-600 text-white' :
                            'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                          }`}>
                            Step {step.step_number} • {step.action_type}
                          </span>
                          <span className="text-xs font-display font-bold text-slate-700 dark:text-slate-300">
                            Tool: {step.tool_name}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 font-normal whitespace-pre-wrap leading-relaxed">
                        {step.thought}
                      </p>

                      {/* Tool Input & Output Accordion */}
                      {step.tool_input && Object.keys(step.tool_input).length > 0 && !isFinal && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                          <div className="p-3.5 rounded-2xl liquid-glass-subtle">
                            <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1 font-display">Tool Input</span>
                            <pre className="text-indigo-600 dark:text-indigo-400 whitespace-pre-wrap">
                              {JSON.stringify(step.tool_input, null, 2)}
                            </pre>
                          </div>
                          <div className="p-3.5 rounded-2xl liquid-glass-subtle">
                            <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1 font-display">Observable Output</span>
                            <pre className="text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap">
                              {JSON.stringify(step.tool_output, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: INDIVIDUAL TOOL TESTING SANDBOX */}
        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tool 1: Calculator */}
            <div className="liquid-glass rounded-3xl p-6 space-y-3.5">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  1. Calculator Sandbox
                </h4>
              </div>
              <input
                type="text"
                value={calcExpr}
                onChange={(e) => setCalcExpr(e.target.value)}
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white"
              />
              <button
                onClick={async () => {
                  const r = await api.testCalculator(calcExpr);
                  setCalcResult(r);
                }}
                className="w-full py-2.5 btn-liquid-pill text-xs font-semibold cursor-pointer"
              >
                Calculate
              </button>
              {calcResult && (
                <pre className="p-3 rounded-2xl liquid-glass-subtle font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  {JSON.stringify(calcResult, null, 2)}
                </pre>
              )}
            </div>

            {/* Tool 2: Date Calculator */}
            <div className="liquid-glass rounded-3xl p-6 space-y-3.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  2. Date Calculator Sandbox
                </h4>
              </div>
              <div className="text-xs space-y-1">
                <span className="text-slate-500 dark:text-slate-400">Add Days from Today:</span>
                <input
                  type="number"
                  value={dateDays}
                  onChange={(e) => setDateDays(Number(e.target.value))}
                  className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={async () => {
                  const r = await api.testDateCalculator({ action: "add", days: dateDays });
                  setDateResult(r);
                }}
                className="w-full py-2.5 btn-liquid-pill text-xs font-semibold cursor-pointer"
              >
                Compute Future Date
              </button>
              {dateResult && (
                <pre className="p-3 rounded-2xl liquid-glass-subtle font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  {JSON.stringify(dateResult, null, 2)}
                </pre>
              )}
            </div>

            {/* Tool 3: Mock Travel Search */}
            <div className="liquid-glass rounded-3xl p-6 space-y-3.5">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  3. Mock Travel Search
                </h4>
              </div>
              <input
                type="text"
                value={travelDest}
                onChange={(e) => setTravelDest(e.target.value)}
                placeholder="Destination (e.g., Goa, Manali, Jaipur)"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white"
              />
              <button
                onClick={async () => {
                  const r = await api.testTravelSearch({ destination: travelDest, duration_days: 2, budget_tier: "budget" });
                  setTravelResult(r);
                }}
                className="w-full py-2.5 btn-liquid-pill text-xs font-semibold cursor-pointer"
              >
                Search Simulated Options
              </button>
              {travelResult && (
                <pre className="p-3 rounded-2xl liquid-glass-subtle font-mono text-[10px] text-emerald-600 dark:text-emerald-400 max-h-48 overflow-y-auto">
                  {JSON.stringify(travelResult.estimated_totals, null, 2)}
                </pre>
              )}
            </div>

            {/* Tool 4: Open-Meteo Weather Tool */}
            <div className="liquid-glass rounded-3xl p-6 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    4. Open-Meteo Live Weather
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Free API
                </span>
              </div>
              <input
                type="text"
                value={weatherLoc}
                onChange={(e) => setWeatherLoc(e.target.value)}
                placeholder="City name (e.g., Tokyo, London, Paris, New York)"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white"
              />
              <button
                onClick={async () => {
                  try {
                    setWeatherLoading(true);
                    const r = await api.testWeather(weatherLoc);
                    setWeatherResult(r);
                  } catch (e: any) {
                    setWeatherResult({ error: e.message });
                  } finally {
                    setWeatherLoading(false);
                  }
                }}
                disabled={weatherLoading}
                className="w-full py-2.5 btn-liquid-pill text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CloudSun className="w-3.5 h-3.5" />
                <span>{weatherLoading ? 'Fetching Live Forecast...' : 'Get Live Weather'}</span>
              </button>
              {weatherResult && (
                <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>{weatherResult.location || weatherLoc}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{weatherResult.temperature}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Condition: <strong className="text-slate-900 dark:text-white">{weatherResult.condition}</strong> (Feels {weatherResult.feels_like})
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Humidity: {weatherResult.humidity}</span>
                    <span>Wind: {weatherResult.wind_speed}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-border/40">
                    Source: {weatherResult.data_source}
                  </div>
                </div>
              )}
            </div>

            {/* Tool 5: CSV Dataset Analyzer */}
            <div className="liquid-glass rounded-3xl p-6 space-y-3.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  5. CSV Dataset Analyzer
                </h4>
              </div>
              <textarea
                rows={3}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="CSV content with headers"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white resize-none"
              />
              <button
                onClick={async () => {
                  const r = await api.testDataAnalysis({ csv_content: csvContent });
                  setCsvResult(r);
                }}
                className="w-full py-2.5 btn-liquid-pill text-xs font-semibold cursor-pointer"
              >
                Analyze CSV Data
              </button>
              {csvResult && (
                <pre className="p-3 rounded-2xl liquid-glass-subtle font-mono text-[10px] text-emerald-600 dark:text-emerald-400 max-h-40 overflow-y-auto">
                  {JSON.stringify(csvResult.statistics || csvResult, null, 2)}
                </pre>
              )}
            </div>

            {/* Tool 6: Text Analysis Tool */}
            <div className="liquid-glass rounded-3xl p-6 space-y-3.5">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h4 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  6. Text & Key Phrase Extractor
                </h4>
              </div>
              <textarea
                rows={3}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste paragraph or policy snippet"
                className="w-full p-3 rounded-2xl liquid-glass-subtle text-xs font-mono text-slate-900 dark:text-white resize-none"
              />
              <button
                onClick={async () => {
                  const r = await api.testTextAnalysis(textInput);
                  setTextResult(r);
                }}
                className="w-full py-2.5 btn-liquid-pill text-xs font-semibold cursor-pointer"
              >
                Extract Phrases & Stats
              </button>
              {textResult && (
                <div className="p-3 rounded-2xl liquid-glass-subtle text-xs space-y-1">
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Words: <strong className="text-slate-900 dark:text-white">{textResult.word_count}</strong> | Sentences: <strong className="text-slate-900 dark:text-white">{textResult.sentence_count}</strong>
                  </div>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Key Phrases: {textResult.key_phrases?.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
