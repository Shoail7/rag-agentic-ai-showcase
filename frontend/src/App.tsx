import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PdfLibrary } from './pages/PdfLibrary';
import { RagExplorer } from './pages/RagExplorer';
import { AiAgentStudio } from './pages/AiAgentStudio';
import { AgenticRagStudio } from './pages/AgenticRagStudio';
import { ChunkSizeLab } from './pages/ChunkSizeLab';
import { LearningCentre } from './pages/LearningCentre';
import { SettingsPage } from './pages/SettingsPage';
import { LimitCheck } from './pages/LimitCheck';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="relative flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-900 dark:bg-[#08090E] dark:text-slate-100 font-sans antialiased selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:bg-indigo-400/25 dark:selection:text-indigo-100 transition-colors duration-300">
          {/* Floating Liquid Aurora Background Blobs */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute -top-[12%] left-[22%] w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-sky-300/40 via-indigo-300/35 to-purple-300/30 dark:from-indigo-600/20 dark:via-purple-600/20 dark:to-cyan-500/15 blur-[120px] animate-aurora-1" />
            <div className="absolute top-[35%] -left-[12%] w-[580px] h-[580px] rounded-full bg-gradient-to-br from-cyan-200/40 via-blue-200/30 to-transparent dark:from-cyan-600/15 dark:to-transparent blur-[140px] animate-aurora-2" />
            <div className="absolute -bottom-[15%] right-[12%] w-[620px] h-[620px] rounded-full bg-gradient-to-tl from-purple-300/30 via-indigo-200/25 to-sky-200/20 dark:from-purple-900/25 dark:via-indigo-950/20 dark:to-transparent blur-[130px] animate-aurora-1" />
          </div>

          {/* Foreground App Interface with Glass Layout */}
          <div className="relative z-10 flex h-full w-full overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pdf-library" element={<PdfLibrary />} />
                <Route path="/rag-explorer" element={<RagExplorer />} />
                <Route path="/agent-studio" element={<AiAgentStudio />} />
                <Route path="/agentic-rag-studio" element={<AgenticRagStudio />} />
                <Route path="/chunk-lab" element={<ChunkSizeLab />} />
                <Route path="/learning-centre" element={<LearningCentre />} />
                <Route path="/limit-check" element={<LimitCheck />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
