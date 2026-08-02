"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/components/Layout';
import {
  Upload,
  FileText,
  Sparkles,
  Download,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ListChecks,
  CalendarClock,
  Hash,
  Tags,
  Clock,
  Gauge,
  Smile
} from 'lucide-react';

export default function SummarizePage() {
  const { showToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get('/api/summarize/sessions');
      if (res.data.success) setSessions(res.data.sessions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleSummarize(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleSummarize(e.target.files[0]);
    }
  };

  const handleSummarize = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      showToast('Unsupported file type. Please upload a PDF or DOCX file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setSummarizing(true);
    try {
      showToast('Extracting and summarizing document...', 'info');
      const res = await axios.post('/api/summarize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast('Summary generated.', 'success');
        setCurrentSession(res.data.session);
        setSessions(prev => [res.data.session, ...prev]);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Summarization failed. Verify server logs.', 'error');
    } finally {
      setSummarizing(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this summary?')) return;
    try {
      await axios.delete(`/api/summarize/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSession?.id === id) setCurrentSession(null);
      showToast('Summary deleted.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete summary.', 'error');
    }
  };

  const handleExport = (id, fileName, format) => {
    window.open(`/api/summarize/sessions/${id}/export/${format}`, '_blank');
  };

  const formatDate = (isoString) => new Date(isoString).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const sentimentColor = (s) => {
    if (s === 'Positive') return 'text-emerald-650 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (s === 'Negative') return 'text-rose-650 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-600 dark:text-slate-350 bg-slate-500/10 border-slate-500/20';
  };

  const renderSummaryBody = (summary) => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${sentimentColor(summary.sentiment)}`}>
          <Smile className="w-3.5 h-3.5" /> {summary.sentiment || 'Neutral'}
        </span>
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-brand-500/20 bg-brand-500/10 text-brand-655 dark:text-brand-400 flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" /> {summary.readabilityScore || 'Medium'} complexity
        </span>
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-350 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> ~{summary.estimatedReadingTime || 4} min read
        </span>
      </div>

      {summary.topics && summary.topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tags className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {summary.topics.map((t, i) => (
            <span key={i} className="px-2 py-0.5 bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-md text-[10px] font-bold">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Overview</span>
        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-4 rounded-xl">
          {summary.shortSummary}
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Detailed Breakdown</span>
        <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line">
          {summary.detailedSummary}
        </p>
      </div>

      {summary.keyPoints && summary.keyPoints.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" /> Key Takeaways
          </span>
          <ul className="space-y-1.5">
            {summary.keyPoints.map((p, i) => (
              <li key={i} className="text-sm text-slate-650 dark:text-slate-300 font-medium flex gap-2">
                <span className="text-brand-500 font-bold">{i + 1}.</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.actionItems && summary.actionItems.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Action Items</span>
          <ul className="space-y-1.5">
            {summary.actionItems.map((a, i) => (
              <li key={i} className="text-sm text-slate-650 dark:text-slate-300 font-medium flex gap-2">
                <span className="w-4 h-4 shrink-0 mt-0.5 border border-slate-350 dark:border-slate-700 rounded-sm" />{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.importantDates && summary.importantDates.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" /> Key Dates
            </span>
            <ul className="space-y-1">
              {summary.importantDates.map((d, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-350 font-semibold">• {d}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.importantNumbers && summary.importantNumbers.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Significant Figures
            </span>
            <ul className="space-y-1">
              {summary.importantNumbers.map((n, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-350 font-semibold">• {n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          Document Summarizer
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
          Upload any resume, job description, or document and get a structured AI summary — key points, action items, dates, and figures.
        </p>
      </div>

      {/* Upload zone */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`
            w-full py-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition duration-155 relative group
            ${dragActive
              ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-900/10 scale-[0.99] shadow-inner'
              : 'border-slate-350 hover:border-brand-400 dark:border-slate-800 dark:hover:border-slate-700/60'
            }
          `}
        >
          {summarizing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Extracting text and generating summary...</p>
            </div>
          ) : (
            <>
              <input
                type="file"
                id="summarize-input"
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleFileInputChange}
              />
              <label htmlFor="summarize-input" className="absolute inset-0 w-full h-full cursor-pointer" />
              <div className="p-3 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded-xl mb-3 group-hover:scale-105 transition">
                <Upload className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 block mb-1">
                Drag and drop a document here
              </span>
              <span className="text-xs text-slate-405 font-medium">Supports PDF & DOCX. One file at a time.</span>
            </>
          )}
        </div>
      </div>

      {/* Current result */}
      {currentSession && (
        <div className="glass-panel p-6 rounded-2xl shadow-sm animate-slide-up space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-850 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Summary</span>
                <h2 className="text-lg font-bold dark:text-white truncate">{currentSession.fileName}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleExport(currentSession.id, currentSession.fileName, 'pdf')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={() => handleExport(currentSession.id, currentSession.fileName, 'docx')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> DOCX
              </button>
            </div>
          </div>
          {renderSummaryBody(currentSession.summary)}
        </div>
      )}

      {/* History */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
        <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <span>Summary History</span>
        </h2>

        {loadingHistory ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm font-semibold">
            No documents summarized yet.
          </div>
        ) : (
          <div className="space-y-3.5">
            {sessions.map(sess => {
              const isExpanded = expandedId === sess.id;
              return (
                <div
                  key={sess.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-700/80 transition duration-150"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : sess.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-xl shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm truncate dark:text-white">{sess.fileName}</h4>
                        <span className="flex items-center gap-1 text-xs text-slate-400 mt-1 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-brand-500" />
                          {formatDate(sess.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleExport(sess.id, sess.fileName, 'pdf')}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-brand-500/20"
                        title="Export as PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(sess.id, e)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-500/20"
                        title="Delete summary"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : sess.id)}
                        className="p-2 text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 animate-fade-in">
                      {renderSummaryBody(sess.summary)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
