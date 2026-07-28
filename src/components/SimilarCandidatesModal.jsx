"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, GitCompareArrows, Sparkles, AlertTriangle } from 'lucide-react';

/**
 * Shows candidates similar to `sourceCandidate`, ranked by real embedding
 * similarity (pure vector math, no AI call needed for the ranking itself).
 * The "Why similar?" explanation is fetched lazily per-candidate only when
 * clicked, so viewing the list never costs more than one API round trip.
 */
export default function SimilarCandidatesModal({ sourceCandidate, onClose, renderScore, showToast }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similarCandidates, setSimilarCandidates] = useState([]);
  const [explanations, setExplanations] = useState({}); // id -> 'loading' | string | null

  useEffect(() => {
    let cancelled = false;

    const fetchSimilar = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post('/api/resumes/similar', { candidateId: sourceCandidate.id });
        if (!cancelled && res.data.success) {
          setSimilarCandidates(res.data.similarCandidates);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to find similar candidates.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSimilar();
    return () => { cancelled = true; };
  }, [sourceCandidate.id]);

  const handleExplain = async (matchId) => {
    setExplanations(prev => ({ ...prev, [matchId]: 'loading' }));
    try {
      const res = await axios.post('/api/resumes/similar', {
        candidateId: sourceCandidate.id,
        explainForId: matchId
      });
      setExplanations(prev => ({ ...prev, [matchId]: res.data.explanation || 'Explanation unavailable.' }));
    } catch (err) {
      setExplanations(prev => ({ ...prev, [matchId]: 'Explanation unavailable — AI is temporarily unavailable.' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-lg">
              <GitCompareArrows className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm dark:text-white">Similar to {sourceCandidate.candidateName}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ranked by real embedding similarity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-400 transition cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-sm">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl flex gap-3 text-rose-700 dark:text-rose-350 font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : similarCandidates.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-semibold">
              No other candidates found across your screening sessions yet.
            </div>
          ) : (
            similarCandidates.map(c => (
              <div key={c.id} className="p-4 rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {renderScore(c.matchPercentage)}
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm dark:text-white truncate">{c.candidateName}</h4>
                      <p className="text-xs text-slate-405 font-bold truncate">Screened for "{c.targetRole}"</p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-bold">
                    {c.similarity}% similar
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(c.matchedSkills || []).slice(0, 5).map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-900 dark:bg-slate-950 text-slate-100 border border-slate-200 dark:border-slate-800 rounded-md text-[9px] font-bold">
                      {skill}
                    </span>
                  ))}
                </div>

                {explanations[c.id] ? (
                  explanations[c.id] === 'loading' ? (
                    <p className="text-xs text-slate-400 italic">Thinking...</p>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium bg-brand-500/5 border border-brand-500/10 rounded-lg p-3">
                      {explanations[c.id]}
                    </p>
                  )
                ) : (
                  <button
                    onClick={() => handleExplain(c.id)}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Why similar?
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
