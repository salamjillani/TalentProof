"use client";

import React, { useState, useEffect, use } from 'react';
import axios from 'axios';
import { Briefcase, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function ApplyPage({ params }) {
  const { jobId } = use(params);

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState('');

  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    axios.get(`/api/pipeline/jobs/${jobId}`)
      .then(res => {
        if (res.data.success) setJob(res.data.job);
      })
      .catch(err => {
        setJobError(err.response?.data?.error || 'This job posting could not be found.');
      })
      .finally(() => setLoadingJob(false));
  }, [jobId]);

  const pickFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setSubmitError('Please upload a PDF or DOCX resume.');
      return;
    }
    setSubmitError('');
    setFile(f);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!candidateEmail.trim()) {
      setSubmitError('Please enter your email address.');
      return;
    }
    if (!file) {
      setSubmitError('Please attach your resume.');
      return;
    }

    const formData = new FormData();
    formData.append('jobPostingId', jobId);
    formData.append('candidateEmail', candidateEmail);
    formData.append('candidateName', candidateName);
    formData.append('file', file);

    setSubmitting(true);
    try {
      const res = await axios.post('/api/apply', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setSubmitted(true);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-800">Job posting not found</h1>
          <p className="text-sm text-slate-500">{jobError || 'This application link may have expired or been removed.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-extrabold text-slate-800">Application Received</h1>
          <p className="text-sm text-slate-500">
            Thank you for applying to <strong>{job.title}</strong>. The hiring team will review your application and be in touch if there&apos;s a fit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-500/10 text-brand-600 rounded-xl border border-brand-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">{job.title}</h1>
          {job.description && (
            <p className="text-sm text-slate-500 max-w-lg mx-auto whitespace-pre-line">{job.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Your Name (optional)</label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="We'll also read this from your resume"
                disabled={submitting}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Your Email *</label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={submitting}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Resume *</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition ${
                dragActive ? 'border-brand-500 bg-brand-50/40' : 'border-slate-300 hover:border-brand-400'
              }`}
            >
              <input
                type="file"
                id="resume-file"
                accept=".pdf,.docx"
                onChange={(e) => e.target.files[0] && pickFile(e.target.files[0])}
                disabled={submitting}
                className="hidden"
              />
              <label htmlFor="resume-file" className="absolute inset-0 cursor-pointer" />
              {file ? (
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <FileText className="w-4 h-4 text-brand-500" /> {file.name}
                </span>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-brand-500 mb-2" />
                  <span className="text-sm font-bold text-slate-700">Drag and drop your resume</span>
                  <span className="text-xs text-slate-400 mt-1">PDF or DOCX</span>
                </>
              )}
            </div>
          </div>

          {submitError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
