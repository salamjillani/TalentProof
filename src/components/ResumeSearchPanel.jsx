"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { Search, Sparkles, GitCompareArrows, Eye, AlertTriangle, Info } from 'lucide-react';

/**
 * Cross-resume RAG search: embeds the query, retrieves the most similar
 * candidates across every past screening session, and shows an AI answer
 * synthesized only from those retrieved candidates alongside the ranked
 * list itself. If synthesis fails but retrieval succeeded, the ranked
 * candidates are still shown — real retrieved data, not a fake answer.
 */
export default function ResumeSearchPanel({ renderScore, onFindSimilar, onOpenScorecard, showToast }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setResult(null);
    try {
      const res = await axios.post('/api/resumes/search', { query });
      if (res.data.success) {
        setResult(res.data);
      }
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Search failed. Please try again.', 'error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl shadow-sm p-6 space-y-5">
      <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
        <Search className="w-5 h-5 text-brand-500" />
        <span>Ask Across All Screened Candidates</span>
      </h2>

      <form onSubmit={handleSearch} className="flex gap-2.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "who has real AWS deployment experience?"'
          disabled={searching}
          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-200"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-500/10 flex items-center gap-2 cursor-pointer shrink-0"
        >
          {searching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>Search</span>
        </button>
      </form>

      {searching && (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {!searching && result && result.message && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-850 rounded-xl flex gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <Info className="w-5 h-5 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}

      {!searching && result && !result.message && (
        <div className="space-y-4 animate-slide-up">
          {result.answer ? (
            <div className="p-4 bg-brand-500/5 border border-brand-500/15 rounded-xl flex gap-3">
              <Sparkles className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{result.answer}</p>
            </div>
          ) : result.answerError ? (
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl flex gap-3 text-amber-800 dark:text-amber-300 font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{result.answerError}</span>
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
              Retrieved Candidates ({result.retrievedCandidates.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.retrievedCandidates.map(c => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-950/20 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {renderScore(c.matchPercentage)}
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm dark:text-white truncate">{c.candidateName}</h4>
                        <p className="text-xs text-slate-405 font-bold truncate">"{c.targetRole}"</p>
                      </div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 bg-brand-500/10 text-brand-655 dark:text-brand-400 border border-brand-500/20 rounded-md text-[10px] font-bold">
                      {c.similarity}% match to query
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => onOpenScorecard(c)}
                      className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Scorecard
                    </button>
                    <button
                      onClick={() => onFindSimilar(c)}
                      className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                    >
                      <GitCompareArrows className="w-3.5 h-3.5" /> Find Similar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
