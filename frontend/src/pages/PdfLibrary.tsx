import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers
} from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../services/api';
import { DocumentItem } from '../types';

export const PdfLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewText, setPreviewText] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'visual' | 'text'>('visual');
  const [docDetailsModal, setDocDetailsModal] = useState<DocumentItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(`Uploading and extracting ${files.length} document(s)...`);
    setErrorMessage(null);

    try {
      const fileArray = Array.from(files);
      const res = await api.uploadDocuments(fileArray);
      const errors = res.uploaded.filter(u => u.status === 'error');
      if (errors.length > 0) {
        setErrorMessage(errors.map(e => `${e.filename}: ${e.message}`).join(', '));
      }
      await loadDocs();
    } catch (e: any) {
      setErrorMessage(e.message || 'Upload error');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This will also remove all associated FAISS vector indexes.`)) {
      return;
    }
    try {
      await api.deleteDocument(id);
      if (previewDoc?.id === id) setPreviewDoc(null);
      if (docDetailsModal?.id === id) setDocDetailsModal(null);
      await loadDocs();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const handleOpenPreview = async (doc: DocumentItem) => {
    setPreviewDoc(doc);
    setPreviewPage(1);
    try {
      const p = await api.getPageText(doc.id, 1);
      setPreviewText(p.page_text);
    } catch (e) {
      setPreviewText('Could not load text for page 1');
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (!previewDoc || newPage < 1 || newPage > previewDoc.page_count) return;
    setPreviewPage(newPage);
    try {
      const p = await api.getPageText(previewDoc.id, newPage);
      setPreviewText(p.page_text);
    } catch (e) {
      setPreviewText('Could not load text for page ' + newPage);
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      setLoading(true);
      await api.queryRAG({
        document_ids: [docId],
        question: "Overview",
        chunk_size: 256,
        chunk_overlap: 30,
        top_k: 1,
        similarity_threshold: 0.0
      });
      await loadDocs();
      alert("Document re-indexed with FAISS successfully!");
    } catch (e: any) {
      alert("Reprocess error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header
        title="Shared PDF Document Library"
        subtitle="Central document repository for RAG, AI Agents, and Chunking Experiments"
        onSampleLoaded={loadDocs}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl liquid-glass border-rose-300 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="font-bold underline ml-4 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Liquid Frosted Upload Section */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          className="liquid-glass border-2 border-dashed border-slate-300/60 dark:border-white/10 rounded-3xl p-8 text-center hover:border-slate-400 dark:hover:border-white/30 transition-all cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-black/5 dark:bg-white/10 text-slate-800 dark:text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-all shadow-xs">
            {uploading ? (
              <RefreshCw className="w-7 h-7 animate-spin text-slate-700 dark:text-slate-300" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-sm font-display font-medium text-slate-900 dark:text-white">
            {uploading ? uploadProgress : 'Drop PDF documents here or click to browse'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed font-normal">
            Supports multiple PDF uploads (up to 50MB each). Validates MIME type, calculates SHA-256 hash to prevent duplicates, and extracts page-level text.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] px-3.5 py-1 rounded-full bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-medium">
              SHA-256 Deduplication
            </span>
            <span className="text-[11px] px-3.5 py-1 rounded-full bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-medium">
              PyMuPDF Extraction
            </span>
            <span className="text-[11px] px-3.5 py-1 rounded-full bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-medium">
              FAISS Local Vector Index
            </span>
          </div>
        </div>

        {/* Document Table */}
        <div className="liquid-glass rounded-3xl overflow-hidden">
          <div className="px-7 py-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Uploaded Documents ({documents.length})
              </h3>
            </div>
            <button
              onClick={loadDocs}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="p-14 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No documents uploaded yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Upload your own PDF or click "Load Sample Handbooks" in the top bar to load the 2024 & 2025 Nexora training documents.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px] font-display">
                    <th className="py-4 px-7">Document Name</th>
                    <th className="py-4 px-4">Pages</th>
                    <th className="py-4 px-4">Size</th>
                    <th className="py-4 px-4">Characters</th>
                    <th className="py-4 px-4">Indexed Chunks</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-7 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-white/40 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-7">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/10 text-slate-800 dark:text-white flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {doc.original_filename}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {doc.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {doc.page_count} pages
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {doc.char_count?.toLocaleString()} chars
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <Layers className="w-3.5 h-3.5" />
                          {doc.chunk_count || 0} chunks
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Ready
                        </span>
                      </td>
                      <td className="py-4 px-7 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPreview(doc)}
                            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Preview PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDocDetailsModal(doc)}
                            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Document Info"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReprocess(doc.id)}
                            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Reprocess / Re-index"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <a
                            href={api.getDownloadUrl(doc.id)}
                            download
                            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id, doc.original_filename)}
                            className="p-2 rounded-xl text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete PDF & clear vectors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PDF Visual & Text Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[90vh] liquid-glass rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/10 text-slate-800 dark:text-white flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-medium text-slate-900 dark:text-white">
                    {previewDoc.original_filename}
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Page {previewPage} of {previewDoc.page_count}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex rounded-full bg-black/5 dark:bg-white/10 p-1 text-xs font-medium">
                  <button
                    onClick={() => setPreviewMode('visual')}
                    className={`px-4 py-1 rounded-full transition-all cursor-pointer ${
                      previewMode === 'visual'
                        ? 'btn-liquid-pill shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Visual Render
                  </button>
                  <button
                    onClick={() => setPreviewMode('text')}
                    className={`px-4 py-1 rounded-full transition-all cursor-pointer ${
                      previewMode === 'text'
                        ? 'btn-liquid-pill shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Extracted Text
                  </button>
                </div>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center items-center bg-black/[0.02] dark:bg-black/20">
              {previewMode === 'visual' ? (
                <div className="shadow-xl rounded-2xl overflow-hidden max-w-full border border-black/10 dark:border-white/10">
                  <img
                    src={api.getPreviewUrl(previewDoc.id, previewPage)}
                    alt={`Page ${previewPage}`}
                    className="max-h-[70vh] object-contain mx-auto"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-full max-w-2xl liquid-glass rounded-3xl p-6 overflow-y-auto">
                  <h4 className="text-xs font-bold font-display uppercase text-slate-400 mb-2 font-mono">
                    Extracted Text Content (Page {previewPage})
                  </h4>
                  <pre className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {previewText || 'Loading text content...'}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer: Page Navigation */}
            <div className="p-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(previewPage - 1)}
                disabled={previewPage <= 1}
                className="btn-frosted-pill flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Page
              </button>
              <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                {previewPage} / {previewDoc.page_count}
              </span>
              <button
                onClick={() => handlePageChange(previewPage + 1)}
                disabled={previewPage >= previewDoc.page_count}
                className="btn-frosted-pill flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                Next Page
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Information Modal */}
      {docDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg liquid-glass rounded-3xl p-7 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <h3 className="text-sm font-display font-medium text-slate-900 dark:text-white">
                Document Metadata & Hash Info
              </h3>
              <button
                onClick={() => setDocDetailsModal(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Original Filename</span>
                <span className="text-slate-900 dark:text-white font-mono font-medium">{docDetailsModal.original_filename}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Document ID</span>
                <span className="text-slate-900 dark:text-white font-mono">{docDetailsModal.id}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">SHA-256 Hash</span>
                <span className="text-slate-900 dark:text-white font-mono break-all p-3 rounded-2xl liquid-glass-subtle block">
                  {docDetailsModal.document_hash}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl liquid-glass-subtle">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Page Count</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">{docDetailsModal.page_count} pages</span>
                </div>
                <div className="p-3.5 rounded-2xl liquid-glass-subtle">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Total Characters</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">{docDetailsModal.char_count?.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Storage Location</span>
                <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] break-all">
                  {docDetailsModal.storage_location}
                </span>
              </div>
            </div>

            <button
              onClick={() => setDocDetailsModal(null)}
              className="w-full py-3 btn-liquid-pill text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
