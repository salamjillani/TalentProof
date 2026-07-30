"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/components/Layout';
import {
  Search,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  Sparkles,
  UserCheck,
  Globe,
  Briefcase
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

export default function JobSearchPage() {
  const { showToast } = useToast();
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('in');
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  const [searching, setSearching] = useState(false);
  const [jobs, setJobs] = useState(null);
  const [ranked, setRanked] = useState(false);
  const [rankedAgainst, setRankedAgainst] = useState(null);
  const [rankError, setRankError] = useState(null);
  const [searchedRole, setSearchedRole] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const res = await axios.get('/api/resumes/sessions');
      if (res.data.success) {
        const flat = [];
        for (const session of res.data.sessions) {
          for (const result of session.results || []) {
            flat.push({
              id: result.id,
              candidateName: result.candidateName,
              targetRole: session.targetRole,
              hasEmbedding: Array.isArray(result.embedding) && result.embedding.length > 0
            });
          }
        }
        setCandidates(flat);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!role.trim()) {
      showToast('Enter a job role or keyword to search.', 'warning');
      return;
    }

    setSearching(true);
    setJobs(null);
    setRankError(null);

    try {
      const res = await axios.post('/api/jobs/search', {
        role,
        location,
        country,
        candidateId: candidateId || undefined
      });

      if (res.data.success) {
        setJobs(res.data.jobs);
        setRanked(!!res.data.ranked);
        setRankedAgainst(res.data.rankedAgainst || null);
        setRankError(res.data.rankError || null);
        setSearchedRole(role);
        if (res.data.jobs.length === 0) {
          showToast('No live postings matched this search.', 'info');
        } else if (res.data.ranked) {
          showToast(`Found ${res.data.jobs.length} live postings, ranked by fit against ${res.data.rankedAgainst}.`, 'success');
        } else {
          showToast(`Found ${res.data.jobs.length} live postings.`, 'success');
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Job search failed. Verify server logs.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown date';
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* Title */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          Job Search
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
          Search real, live job postings by role, and optionally rank them by semantic fit against one of your screened resumes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Search form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSearch} className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-brand-500" />
              <span>Search Parameters</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Job Role / Keyword
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. React Developer"
                  disabled={searching}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, Remote"
                  disabled={searching}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Market
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={searching}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Rank by fit against (optional)
                </label>
                <select
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  disabled={searching || loadingCandidates}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="">Don&apos;t rank — just search</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id} disabled={!c.hasEmbedding}>
                      {c.candidateName} ({c.targetRole}){!c.hasEmbedding ? ' — no embedding' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={searching}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-500/10 flex items-center gap-2 cursor-pointer"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Searching Live Postings...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search Jobs</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right column: how it works */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-md flex items-center gap-2 dark:text-white">
              <Globe className="w-5 h-5 text-brand-500" />
              How This Works
            </h2>
            <div className="text-xs md:text-sm leading-relaxed space-y-3">
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Results come from Adzuna&apos;s live job index, which aggregates real postings from thousands of job boards and company career sites — not a fixed list, not fabricated.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-500 font-semibold">
                <span className="font-bold block text-slate-700 dark:text-slate-350">If you pick a candidate to rank against:</span>
                <div>• Each live posting&apos;s title + description is embedded locally.</div>
                <div>• Compared via cosine similarity to that resume&apos;s stored embedding.</div>
                <div>• Sorted by genuine semantic fit — not keyword overlap.</div>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium italic">
                Note: Adzuna doesn&apos;t index Pakistan directly — India is set as the default nearby market with heavy remote/tech coverage. Switch markets above as needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {jobs !== null && (
        <div className="glass-panel p-6 rounded-2xl shadow-sm animate-slide-up space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-850 pb-4">
            <div>
              <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Live Results</span>
              <h2 className="text-lg font-bold dark:text-white flex items-center gap-2 mt-0.5">
                <Briefcase className="w-5 h-5 text-brand-500" />
                <span>&quot;{searchedRole}&quot; — {jobs.length} postings</span>
              </h2>
            </div>
            {ranked && rankedAgainst && (
              <div className="text-xs text-brand-655 dark:text-brand-400 font-bold bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                <span>Ranked by fit vs. {rankedAgainst}</span>
              </div>
            )}
          </div>

          {rankError && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 font-semibold">
              {rankError}
            </div>
          )}

          {jobs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm font-semibold">
              No live postings matched this search. Try a broader role or a different market.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-950/20 space-y-3 hover:border-brand-500/30 transition shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm dark:text-white leading-snug">{job.title}</h4>
                      <p className="text-xs text-slate-450 font-bold flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{job.company}</span>
                      </p>
                    </div>
                    {ranked && (
                      <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black ${fitColor(job.fitScore)}`}>
                        {job.fitScore === null ? 'N/A' : `${job.fitScore}%`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-500" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-500" />
                      {formatDate(job.created)}
                    </span>
                    {formatSalary(job.salaryMin, job.salaryMax) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-brand-500" />
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium line-clamp-3">
                    {job.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    {job.category && (
                      <span className="px-2.5 py-0.5 bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-md text-[9px] font-bold">
                        {job.category}
                      </span>
                    )}
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      View & Apply <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
