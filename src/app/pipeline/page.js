"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '@/components/Layout';
import {
  Briefcase,
  Plus,
  Copy,
  X,
  Sparkles,
  CheckCircle2,
  Mail,
  Send,
  Loader2,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { STAGES, REJECTED, STAGE_LABELS } from '@/services/pipelineService';

const BOARD_STAGES = [...STAGES, REJECTED];

export default function PipelinePage() {
  const { showToast } = useToast();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [creatingJob, setCreatingJob] = useState(false);

  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await axios.get('/api/pipeline/jobs');
      if (res.data.success) {
        setJobs(res.data.jobs);
        if (!selectedJobId && res.data.jobs.length > 0) setSelectedJobId(res.data.jobs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchApplications = useCallback(async (jobId) => {
    if (!jobId) { setApplications([]); return; }
    setLoadingApplications(true);
    try {
      const res = await axios.get(`/api/pipeline/applications?jobPostingId=${jobId}`);
      if (res.data.success) setApplications(res.data.applications);
    } catch (err) {
      console.error(err);
      showToast('Failed to load applications.', 'error');
    } finally {
      setLoadingApplications(false);
    }
  }, [showToast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { fetchApplications(selectedJobId); }, [selectedJobId, fetchApplications]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJobTitle.trim()) {
      showToast('Job title is required.', 'warning');
      return;
    }
    setCreatingJob(true);
    try {
      const res = await axios.post('/api/pipeline/jobs', { title: newJobTitle, description: newJobDescription });
      if (res.data.success) {
        setJobs(prev => [res.data.job, ...prev]);
        setSelectedJobId(res.data.job.id);
        setNewJobTitle('');
        setNewJobDescription('');
        setShowNewJobForm(false);
        showToast('Job posting created. Share the apply link with candidates.', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create job posting.', 'error');
    } finally {
      setCreatingJob(false);
    }
  };

  const copyApplyLink = (jobId) => {
    const link = `${window.location.origin}/apply/${jobId}`;
    navigator.clipboard.writeText(link);
    showToast('Apply link copied to clipboard.', 'success');
  };

  const copyApplyEmail = (email) => {
    navigator.clipboard.writeText(email);
    showToast('Apply email address copied to clipboard.', 'success');
  };

  const openApplication = async (app) => {
    setSelectedApp(app);
    if (!app.seenByRecruiter) {
      try {
        await axios.post(`/api/pipeline/applications/${app.id}/seen`);
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, seenByRecruiter: true } : a));
      } catch {
        // Non-critical: badge just won't clear this time.
      }
    }
  };

  const handleApprove = async (app) => {
    if (!app.recommendation) return;
    try {
      const res = await axios.patch(`/api/pipeline/applications/${app.id}`, { stage: app.recommendation.action });
      if (res.data.success) {
        setApplications(prev => prev.map(a => a.id === app.id ? res.data.application : a));
        setSelectedApp(res.data.application);
        showToast(`Moved to ${STAGE_LABELS[res.data.application.stage]}.`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update stage.', 'error');
    }
  };

  const newCount = applications.filter(a => !a.seenByRecruiter).length;
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          Hiring Pipeline
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
          Applications come in automatically through your public apply link, get scored with evidence, and move through the pipeline only when you approve.
        </p>
      </div>

      {/* Job selector */}
      <div className="glass-panel p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {jobs.map(job => (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                selectedJobId === job.id
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {job.title}
            </button>
          ))}
          <button
            onClick={() => setShowNewJobForm(v => !v)}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-brand-400 hover:text-brand-600 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Job Posting
          </button>
        </div>

        {showNewJobForm && (
          <form onSubmit={handleCreateJob} className="space-y-3 border-t border-slate-150 dark:border-slate-850 pt-4">
            <input
              type="text"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              placeholder="Job title, e.g. Senior Backend Engineer"
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <textarea
              value={newJobDescription}
              onChange={(e) => setNewJobDescription(e.target.value)}
              placeholder="Job description (used to score applicants against this role)"
              rows={3}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
            <button
              type="submit"
              disabled={creatingJob}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition cursor-pointer"
            >
              {creatingJob ? 'Creating...' : 'Create Job Posting'}
            </button>
          </form>
        )}

        {selectedJob && (
          <div className="space-y-2 border-t border-slate-150 dark:border-slate-850 pt-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Public apply link:</span>
              <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-brand-600 dark:text-brand-400">/apply/{selectedJob.id}</code>
              <button onClick={() => copyApplyLink(selectedJob.id)} className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              {newCount > 0 && (
                <span className="ml-auto px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full font-bold">
                  {newCount} new
                </span>
              )}
            </div>
            {selectedJob.applyEmail && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Inbox className="w-3.5 h-3.5 shrink-0" />
                <span>Or email resume to:</span>
                <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-brand-600 dark:text-brand-400">{selectedJob.applyEmail}</code>
                <button onClick={() => copyApplyEmail(selectedJob.applyEmail)} className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      {loadingApplications ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : !selectedJobId ? (
        <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm font-semibold">
          Create a job posting above to get a public apply link.
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {BOARD_STAGES.map(stage => {
              const stageApps = applications.filter(a => a.stage === stage);
              return (
                <div key={stage} className="w-64 shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{STAGE_LABELS[stage]}</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded-full">{stageApps.length}</span>
                  </div>
                  <div className="space-y-2.5 min-h-[60px]">
                    {stageApps.map(app => (
                      <button
                        key={app.id}
                        onClick={() => openApplication(app)}
                        className="w-full text-left p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-400 dark:hover:border-brand-500/50 transition shadow-xs relative cursor-pointer"
                      >
                        {!app.seenByRecruiter && (
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
                        )}
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-4">{app.candidateName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{app.candidateEmail}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs font-black ${app.matchPercentage >= 75 ? 'text-emerald-600' : app.matchPercentage >= 45 ? 'text-amber-600' : 'text-rose-500'}`}>
                            {app.matchPercentage}%
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onApprove={handleApprove}
          onUpdated={(updated) => {
            setSelectedApp(updated);
            setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
          }}
          jobTitle={selectedJob?.title}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function ApplicationDetailModal({ application, onClose, onApprove, onUpdated, showToast }) {
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null); // {subject, body, type, draftIndex}
  const [sending, setSending] = useState(false);

  const handleDraft = async (type) => {
    setDrafting(true);
    setDraft(null);
    try {
      const res = await axios.post(`/api/pipeline/applications/${application.id}/draft-email`, { type });
      if (res.data.success) {
        setDraft({ ...res.data.draft, type, draftIndex: res.data.draftIndex });
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to draft email.', 'error');
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!draft) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/pipeline/applications/${application.id}/send-email`, {
        subject: draft.subject,
        body: draft.body,
        draftIndex: draft.draftIndex,
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setDraft(null);
      }
    } catch (err) {
      if (err.response?.data?.notConfigured) {
        showToast('Email sending is not connected. Add EMAIL_USER and EMAIL_APP_PASSWORD to enable it.', 'warning');
      } else {
        showToast(err.response?.data?.error || 'Failed to send email.', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[88vh]">
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-extrabold text-sm dark:text-white">{application.candidateName}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{application.candidateEmail} · {STAGE_LABELS[application.stage]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-400 transition cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-sm">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-black ${application.matchPercentage >= 75 ? 'text-emerald-600' : application.matchPercentage >= 45 ? 'text-amber-600' : 'text-rose-500'}`}>
              {application.matchPercentage}%
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{application.justification}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Matched Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {(application.matchedSkills || []).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Missing Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {(application.missingSkills || []).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-rose-500/10 text-rose-650 dark:text-rose-400 border border-rose-500/20 rounded-md text-[10px] font-bold">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {application.evidence && application.evidence.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Evidence</span>
              {application.evidence.map((ev, i) => (
                <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-brand-655 dark:text-brand-400">{ev.skill}</span>
                    {ev.verified ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                    ) : (
                      <span className="text-amber-600 font-bold text-[10px]">Unconfirmed</span>
                    )}
                  </div>
                  <p className="text-slate-500 italic">&ldquo;{ev.quote}&rdquo;</p>
                </div>
              ))}
            </div>
          )}

          {application.recommendation && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Recommendation
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{application.recommendation.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{application.recommendation.reasoning}</p>
              <button
                onClick={() => onApprove(application)}
                className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Approve & Move to {STAGE_LABELS[application.recommendation.action]}
              </button>
            </div>
          )}

          <div className="space-y-3 border-t border-slate-150 dark:border-slate-850 pt-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Candidate Email
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleDraft('interview_invite')}
                disabled={drafting}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                Draft Interview Invite
              </button>
              <button
                onClick={() => handleDraft('rejection')}
                disabled={drafting}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                Draft Rejection
              </button>
              {drafting && <Loader2 className="w-4 h-4 animate-spin text-slate-400 self-center" />}
            </div>

            {draft && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl">
                <input
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                />
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={6}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs resize-y"
                />
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? 'Sending...' : `Send to ${application.candidateEmail}`}
                </button>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Review before sending, this sends a real email.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
