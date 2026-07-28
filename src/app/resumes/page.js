"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/components/Layout';
import ResumeSearchPanel from '@/components/ResumeSearchPanel';
import SimilarCandidatesModal from '@/components/SimilarCandidatesModal';
import {
  Upload,
  Search,
  Users,
  Trash2,
  Calendar,
  UserCheck,
  Sparkles,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  Plus,
  Minus,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  GitCompareArrows
} from 'lucide-react';

export default function ResumeScreener() {
  const { showToast } = useToast();
  const [targetRole, setTargetRole] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Results & History
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  // Drag & Drop
  const [dragActive, setDragActive] = useState(false);

  // Detailed Scorecard Modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);

  // Find Similar Candidates Modal
  const [similarModalCandidate, setSimilarModalCandidate] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get('/api/resumes/sessions');
      if (res.data.success) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch screening sessions history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ext === 'pdf' || ext === 'docx';
      });

      if (files.length === 0) {
        showToast('Please upload only PDF or DOCX files.', 'warning');
        return;
      }
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ext === 'pdf' || ext === 'docx';
      });

      if (files.length === 0) {
        showToast('Please upload only PDF or DOCX files.', 'warning');
        return;
      }
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      showToast('Please specify a target job role/topic (e.g. MERN Developer).', 'warning');
      return;
    }
    if (selectedFiles.length === 0) {
      showToast('Please select at least one resume file to analyze.', 'warning');
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    setStatusMessage('Uploading resumes...');

    const formData = new FormData();
    formData.append('targetRole', targetRole);
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      showToast(`Screening ${selectedFiles.length} resumes. Please stand by...`, 'info');

      const response = await axios.post('/api/resumes/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percent);
          if (percent === 100) {
            setStatusMessage('Scoring resumes and generating embeddings...');
          }
        }
      });

      if (response.data.success) {
        showToast('Bulk screening session completed successfully!', 'success');
        setCurrentSession(response.data.session);
        setSessions(prev => [response.data.session, ...prev]);
        setSelectedFiles([]);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Bulk analysis failed. Verify server logs.', 'error');
    } finally {
      setAnalyzing(false);
      setProgress(0);
      setStatusMessage('');
    }
  };

  const handleDeleteSession = async (id, role, e) => {
    e.stopPropagation();
    if (!confirm(`Delete screening session for "${role}"?`)) {
      return;
    }
    try {
      const res = await axios.delete(`/api/resumes/sessions/${id}`);
      if (res.data.success) {
        showToast('Screening session deleted.', 'success');
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSession && currentSession.id === id) {
          setCurrentSession(null);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete session.', 'error');
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openScorecard = (candidate, role) => {
    setSelectedCandidate({ ...candidate, targetRole: role });
    setScorecardModalOpen(true);
  };

  // Render circular progress bar for compatibility rate
  const renderRadialProgress = (percentage) => {
    const strokeWidth = 3;
    const radius = 15.9155;
    const circ = 2 * Math.PI * radius; // 100
    const offset = circ - (percentage / 100) * circ;

    let strokeColor = 'text-rose-500';
    if (percentage >= 80) strokeColor = 'text-emerald-500';
    else if (percentage >= 50) strokeColor = 'text-amber-500';

    return (
      <div className="relative flex items-center justify-center shrink-0 w-12 h-12">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-100 dark:text-slate-805"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="none"
            d={`M18 2.0845 a ${radius} ${radius} 0 0 1 0 31.831 a ${radius} ${radius} 0 0 1 0 -31.831`}
          />
          <path
            className={`${strokeColor} transition-all duration-500`}
            strokeDasharray="100"
            strokeDashoffset={offset}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d={`M18 2.0845 a ${radius} ${radius} 0 0 1 0 31.831 a ${radius} ${radius} 0 0 1 0 -31.831`}
          />
        </svg>
        <span className="absolute text-[10px] font-black text-slate-700 dark:text-slate-200">
          {percentage}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* Title */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          Bulk Resume Screener
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
          Upload candidate resumes in bulk, define your target job requirements, and rank profiles by compatibility.
        </p>
      </div>

      {/* Screen controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left column: Setup & Upload */}
        <div className="lg:col-span-2 space-y-6">

          <form onSubmit={handleAnalyze} className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-brand-500" />
              <span>Job Role Parameters</span>
            </h2>

            {/* Target Role Input */}
            <div className="space-y-2">
              <label htmlFor="target-role" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Target Job Role / Tech Stack
              </label>
              <input
                type="text"
                id="target-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior MERN Developer (React, Node, Express, MongoDB, AWS)"
                disabled={analyzing}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Files Drag and Drop zone */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Upload Candidate Resumes (PDF / DOCX)
              </span>

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
                {analyzing ? (
                  <div className="w-full max-w-sm text-center px-4 space-y-4">
                    <div className="inline-flex p-3 bg-brand-500/10 text-brand-655 rounded-full animate-spin border border-brand-500/25">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                        {statusMessage}
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full transition-all duration-300 animate-progress bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      id="bulk-resumes-input"
                      multiple
                      className="hidden"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="bulk-resumes-input" className="absolute inset-0 w-full h-full cursor-pointer" />
                    <div className="p-3 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded-xl mb-3 group-hover:scale-105 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 block mb-1">
                      Drag and drop candidate files here
                    </span>
                    <span className="text-xs text-slate-405 font-medium">Supports PDF & DOCX. Select multiple files.</span>
                  </>
                )}
              </div>
            </div>

            {/* List of uploaded files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2.5 border-t border-slate-150 dark:border-slate-850 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Files Selected ({selectedFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={clearFiles}
                    disabled={analyzing}
                    className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                        <span className="truncate max-w-[280px] font-bold dark:text-slate-200">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        disabled={analyzing}
                        className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form actions */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={analyzing || selectedFiles.length === 0}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-500/10 flex items-center gap-2 cursor-pointer"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Analyzing Resumes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Analyze Resumes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Instructions & Details */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-md flex items-center gap-2 dark:text-white">
              <UserCheck className="w-5 h-5 text-brand-500" />
              Screener Operations
            </h2>
            <div className="text-xs md:text-sm leading-relaxed space-y-3">
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Every resume is scored against your target role, and embedded for retrieval — enabling the search and similarity tools below.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-500 font-semibold">
                <span className="font-bold block text-slate-700 dark:text-slate-350">Automated Pipeline Checks:</span>
                <div>• Auto-extract candidate profile name.</div>
                <div>• Score compatibility (0-100% circular radial gauge).</div>
                <div>• Compare matched tech skills vs. missing skills.</div>
                <div>• Generate a local embedding for RAG search + similarity.</div>
                <div>• Auto-generate mock prep questions.</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Cross-resume RAG Search */}
      <ResumeSearchPanel
        renderScore={renderRadialProgress}
        onOpenScorecard={(c) => openScorecard(c, c.targetRole)}
        onFindSimilar={(c) => setSimilarModalCandidate(c)}
        showToast={showToast}
      />

      {/* Analysis Results Display */}
      {currentSession && (
        <div className="glass-panel p-6 rounded-2xl shadow-sm animate-slide-up space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-850 pb-4">
            <div>
              <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Screening Results</span>
              <h2 className="text-lg font-bold dark:text-white flex items-center gap-2 mt-0.5">
                <Users className="w-5 h-5 text-brand-500" />
                <span>Job Role: "{currentSession.targetRole}"</span>
              </h2>
            </div>
            <div className="text-xs text-slate-450 font-bold bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-500" />
              <span>{formatDate(currentSession.date)}</span>
            </div>
          </div>

          {/* Results Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSession.results.map((res, i) => (
              <div
                key={res.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-950/20 space-y-4 hover:border-brand-500/30 transition relative group shadow-xs hover:shadow-sm"
              >
                {/* Ranking Badge */}
                <div className="absolute top-4 right-4 text-xs font-bold text-slate-400">
                  Rank #{i + 1}
                </div>

                <div
                  onClick={() => openScorecard(res, currentSession.targetRole)}
                  className="flex items-center gap-4 cursor-pointer"
                >
                  {/* Circular visual progress meter */}
                  {renderRadialProgress(res.matchPercentage)}

                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm dark:text-white truncate pr-10">{res.candidateName}</h4>
                    <p className="text-xs text-slate-405 font-bold truncate mt-1">{res.fileName}</p>
                  </div>
                </div>

                {/* Justification summary */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Recruiter Assessment</span>
                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium line-clamp-2">
                    {res.justification}
                  </p>
                </div>

                {/* Matched skills badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Top Tech Skills Matched</span>
                  <div className="flex flex-wrap gap-1.5">
                    {res.matchedSkills.slice(0, 4).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-0.5 bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-md text-[9px] font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                    {res.matchedSkills.length === 0 && (
                      <span className="text-[9px] text-slate-400 italic font-medium">No matching tech skills detected.</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1.5">
                  <button
                    onClick={() => setSimilarModalCandidate({ ...res, targetRole: currentSession.targetRole })}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition"
                  >
                    <GitCompareArrows className="w-3.5 h-3.5" /> Find Similar
                  </button>
                  <div className="text-[10px] text-brand-600 dark:text-brand-400 font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                    <span>Open detailed scorecard</span>
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions History List */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
        <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-500" />
          <span>Screening Sessions History</span>
        </h2>

        {loadingHistory ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm font-semibold">
            No screening pipelines saved yet.
          </div>
        ) : (
          <div className="space-y-3.5">
            {sessions.map(sess => {
              const isExpanded = expandedSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-700/80 transition duration-150"
                >
                  {/* Session Header Clickable */}
                  <div
                    onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-xl shrink-0">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm truncate dark:text-white">
                          Job Role: "{sess.targetRole}"
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-1 font-bold">
                          <span className="flex items-center gap-1 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-brand-500" />
                            {formatDate(sess.date)}
                          </span>
                          <span>•</span>
                          <span>{sess.results.length} Candidates Screened</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, sess.targetRole, e)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-500/20"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                        className="p-2 text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Session Table Grid */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 space-y-3.5 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sess.results.map((res, i) => (
                          <div
                            key={res.id}
                            className="p-4 rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/40 text-xs space-y-3 hover:border-brand-500/25 transition"
                          >
                            <div
                              onClick={() => openScorecard(res, sess.targetRole)}
                              className="flex justify-between items-center gap-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {renderRadialProgress(res.matchPercentage)}
                                <h5 className="font-extrabold truncate dark:text-white leading-tight">{res.candidateName}</h5>
                              </div>
                              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] shrink-0">Rank #{i + 1}</span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assessment</span>
                              <p className="text-slate-650 dark:text-slate-300 leading-relaxed font-medium line-clamp-2">
                                {res.justification}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Key Skills</span>
                              <div className="flex flex-wrap gap-1">
                                {res.matchedSkills.slice(0, 4).map((skill, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-2 py-0.5 bg-slate-900 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-[9px] font-bold text-slate-200"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => setSimilarModalCandidate({ ...res, targetRole: sess.targetRole })}
                              className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition pt-1"
                            >
                              <GitCompareArrows className="w-3.5 h-3.5" /> Find Similar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ATS Compatibility Scorecard & Interview Prep Modal */}
      {scorecardModalOpen && selectedCandidate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-brand-500/10 text-brand-655 border border-brand-500/20 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm dark:text-white">ATS Candidate Compatibility Scorecard</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Screening Report & Interview Prep</p>
                </div>
              </div>
              <button
                onClick={() => setScorecardModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-400 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 text-sm">
              <div className="flex items-start justify-between gap-6 border-b border-slate-100 dark:border-slate-850 pb-4">
                <div className="space-y-1.5">
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{selectedCandidate.candidateName}</h3>
                  <div className="text-xs text-slate-400 font-bold flex flex-wrap gap-x-3 gap-y-1">
                    <span>File: {selectedCandidate.fileName}</span>
                    <span>•</span>
                    <span>Role Target: "{selectedCandidate.targetRole}"</span>
                  </div>
                </div>

                {/* Score gauge in header */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  {renderRadialProgress(selectedCandidate.matchPercentage)}
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">Match Compatibility</span>
                </div>
              </div>

              {/* Recruiter Justification Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recruiter Assessment & Strengths</h4>
                <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-semibold bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150/50 dark:border-slate-850 rounded-xl">
                  {selectedCandidate.justification}
                </p>
              </div>

              {/* Skills breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Matched Keywords */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-500 stroke-[3px]" />
                    Matched Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.matchedSkills?.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!selectedCandidate.matchedSkills || selectedCandidate.matchedSkills.length === 0) && (
                      <span className="text-xs text-slate-400 italic font-medium">None detected in text.</span>
                    )}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Minus className="w-3.5 h-3.5 text-rose-500 stroke-[3px]" />
                    Missing Critical Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.missingSkills?.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 bg-rose-500/10 text-rose-650 dark:text-rose-455 border border-rose-500/20 rounded-md text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!selectedCandidate.missingSkills || selectedCandidate.missingSkills.length === 0) && (
                      <span className="text-xs text-slate-400 italic font-medium">No core missing skills detected.</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Mock Screening Questions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  AI Suggested Mock Interview Questions
                </h4>
                <div className="space-y-3.5">
                  {selectedCandidate.interviewQuestions?.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-3.5 bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/15 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium"
                    >
                      <span className="w-5 h-5 shrink-0 bg-brand-500/15 border border-brand-500/20 rounded-full flex items-center justify-center font-bold text-brand-655 dark:text-brand-350">
                        {qIdx + 1}
                      </span>
                      <span>{q}</span>
                    </div>
                  ))}
                  {(!selectedCandidate.interviewQuestions || selectedCandidate.interviewQuestions.length === 0) && (
                    <p className="text-xs text-slate-405 italic font-medium">No mock questions generated.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setScorecardModalOpen(false)}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition shadow-md shadow-brand-500/10 cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find Similar Candidates Modal */}
      {similarModalCandidate && (
        <SimilarCandidatesModal
          sourceCandidate={similarModalCandidate}
          onClose={() => setSimilarModalCandidate(null)}
          renderScore={renderRadialProgress}
          showToast={showToast}
        />
      )}

    </div>
  );
}
