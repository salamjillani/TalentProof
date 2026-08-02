"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '@/components/Layout';
import {
  Upload,
  Briefcase,
  Sparkles,
  Plus,
  Minus,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  HelpCircle,
  ShieldCheck,
  Quote,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

const COUNTRIES = [
  { code: 'in', label: 'India' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'us', label: 'United States' },
  { code: 'au', label: 'Australia' },
  { code: 'ca', label: 'Canada' },
  { code: 'de', label: 'Germany' },
  { code: 'sg', label: 'Singapore' },
  { code: 'za', label: 'South Africa' }
];

export default function CareerAssistantPage() {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('in');
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const pickFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      showToast('Unsupported file type. Please upload a PDF or DOCX resume.', 'error');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) pickFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast('Please upload your resume first.', 'warning');
      return;
    }
    if (!targetRole.trim()) {
      showToast('Please tell us the role you\'re targeting.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetRole', targetRole);
    formData.append('jobDescription', jobDescription);
    formData.append('location', location);
    formData.append('country', country);

    setAnalyzing(true);
    setResult(null);
    try {
      showToast('Analyzing your resume and searching live postings...', 'info');
      const res = await axios.post('/api/career-assistant/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setResult(res.data);
        showToast('Done — see your results below.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Analysis failed. Please try again.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown date';
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return null;
    const fmt = (n) => `${Math.round(n / 1000)}k`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    return fmt(min || max);
  };

  const fitColor = (score) => {
    if (score === null || score === undefined) return 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
    if (score >= 70) return 'text-emerald-650 bg-emerald-500/10 dark:text-emerald-400';
    if (score >= 45) return 'text-amber-650 bg-amber-500/10 dark:text-amber-400';
    return 'text-rose-650 bg-rose-500/10 dark:text-rose-400';
  };

  const matchStroke = (percentage) => {
    if (percentage >= 80) return 'text-emerald-500';
    if (percentage >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          Career Assistant
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
          Upload your resume, tell us the role you want, and get your match score, interview prep, and live matching jobs — all private to you.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume upload */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Your Resume (PDF / DOCX)
              </span>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition duration-155 relative group
                  ${dragActive
                    ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-900/10 scale-[0.99] shadow-inner'
                    : 'border-slate-350 hover:border-brand-400 dark:border-slate-800 dark:hover:border-slate-700/60'
                  }
                `}
              >
                <input
                  type="file"
                  id="career-resume-input"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileInputChange}
                  disabled={analyzing}
                />
                <label htmlFor="career-resume-input" className="absolute inset-0 w-full h-full cursor-pointer" />
                <div className="p-3 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded-xl mb-2 group-hover:scale-105 transition">
                  <Upload className="w-5 h-5" />
                </div>
                {file ? (
                  <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 truncate max-w-[240px]">{file.name}</span>
                ) : (
                  <>
                    <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 block mb-0.5">Drag and drop your resume</span>
                    <span className="text-xs text-slate-405 font-medium">PDF or DOCX, one file</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Target Role / Keyword
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. React Developer"
                  disabled={analyzing}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote"
                    disabled={analyzing}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Market</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={analyzing}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
                  >
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Paste Full Job Description (optional, for a more accurate match score)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting text here for a more precise match score. Leave blank to just match against the role/keyword above."
              rows={4}
              disabled={analyzing}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200 resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 dark:text-slate-550 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              Nothing you upload here is saved or visible to any HR user.
            </p>
            <button
              type="submit"
              disabled={analyzing}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-500/10 flex items-center gap-2 cursor-pointer shrink-0"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze My Fit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="space-y-8 animate-slide-up">

          {/* Match scorecard */}
          <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center shrink-0 w-16 h-16">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100 dark:text-slate-805" strokeWidth="3" stroke="currentColor" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className={`${matchStroke(result.matchPercentage)} transition-all duration-500`}
                    strokeDasharray="100" strokeDashoffset={100 - (result.matchPercentage || 0)}
                    strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-sm font-black text-slate-700 dark:text-slate-200">{result.matchPercentage}%</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Match Score for &quot;{targetRole}&quot;</span>
                <p className="text-sm text-slate-650 dark:text-slate-300 font-medium leading-relaxed mt-1">{result.justification}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-500 stroke-[3px]" /> Matched Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(result.matchedSkills || []).map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold">{s}</span>
                  ))}
                  {(!result.matchedSkills || result.matchedSkills.length === 0) && <span className="text-xs text-slate-400 italic">None detected.</span>}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Minus className="w-3.5 h-3.5 text-rose-500 stroke-[3px]" /> Missing Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(result.missingSkills || []).map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-rose-500/10 text-rose-650 dark:text-rose-455 border border-rose-500/20 rounded-md text-xs font-bold">{s}</span>
                  ))}
                  {(!result.missingSkills || result.missingSkills.length === 0) && <span className="text-xs text-slate-400 italic">None detected.</span>}
                </div>
              </div>
            </div>

            {result.evidence && result.evidence.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-brand-500" /> Evidence — Why This Score
                </h4>
                <div className="space-y-2">
                  {result.evidence.map((ev, i) => (
                    <div key={i} className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-brand-500/10 text-brand-655 dark:text-brand-400 border border-brand-500/20 rounded-md text-[10px] font-bold">{ev.skill}</span>
                        {ev.verified ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-650 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Verified in resume text
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-650 dark:text-amber-400">
                            <ShieldAlert className="w-3 h-3" /> Paraphrased, unconfirmed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium italic">&ldquo;{ev.quote}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interview prep */}
          <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-500" />
              <span>Tailored Interview Prep</span>
            </h2>
            {result.interviewError ? (
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 font-semibold">{result.interviewError}</p>
            ) : (
              <div className="space-y-3">
                {(result.interviewQuestions || []).map((q, i) => (
                  <div key={i} className="p-3.5 bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/15 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-medium space-y-1.5">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 shrink-0 bg-brand-500/15 border border-brand-500/20 rounded-full flex items-center justify-center font-bold text-xs text-brand-655 dark:text-brand-350">{i + 1}</span>
                      <span>{q.question}</span>
                    </div>
                    {q.talkingPoints && q.talkingPoints.length > 0 && (
                      <ul className="pl-8 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        {q.talkingPoints.map((p, pi) => <li key={pi}>• {p}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live matching jobs */}
          <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-brand-500" />
                <span>Live Matching Jobs</span>
              </h2>
              {result.jobsRanked && (
                <span className="text-xs text-brand-655 dark:text-brand-400 font-bold bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-lg">
                  Ranked by fit against your resume
                </span>
              )}
            </div>

            {result.jobsError ? (
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 font-semibold">{result.jobsError}</p>
            ) : (result.jobs || []).length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm font-semibold">
                No live postings matched this search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.jobs.map((job) => (
                  <div key={job.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-950/20 space-y-3 hover:border-brand-500/30 transition shadow-xs hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm dark:text-white leading-snug">{job.title}</h4>
                        <p className="text-xs text-slate-450 font-bold flex items-center gap-1.5 mt-1">
                          <Building2 className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{job.company}</span>
                        </p>
                      </div>
                      {result.jobsRanked && (
                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black ${fitColor(job.fitScore)}`}>
                          {job.fitScore === null ? 'N/A' : `${job.fitScore}%`}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-500" />{job.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand-500" />{formatDate(job.created)}</span>
                      {formatSalary(job.salaryMin, job.salaryMax) && (
                        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-brand-500" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium line-clamp-3">{job.description}</p>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 justify-end">
                      View & Apply <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
