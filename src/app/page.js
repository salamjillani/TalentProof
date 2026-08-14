"use client";

import React from 'react';
import Link from 'next/link';
import {
  Users,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Search,
  GitCompareArrows,
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">

      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          TalentProof
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base font-bold">
          Bulk resume screening with real retrieval-augmented candidate search
        </p>
      </div>

      <div className="glass-panel rounded-2xl shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <span>How this is different</span>
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
          Every resume you screen is embedded and stored, not just scored and forgotten. That means you can{' '}
          <span className="font-bold text-slate-800 dark:text-slate-100">search across every candidate you've ever screened</span>{' '}
          in plain English, and find candidates similar to any one you liked — both powered by real vector
          retrieval, not keyword matching.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/resumes"
          className="glass-panel p-6 rounded-2xl shadow-sm hover:scale-[1.02] transition duration-300 flex flex-col gap-4 group"
        >
          <div className="p-3 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-500/20 shadow-inner w-fit">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg dark:text-white mb-1">Bulk Resume Screener</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Upload many resumes against a target role, get a ranked shortlist. Includes RAG search and
              Find Similar Candidates.
            </p>
          </div>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 mt-auto group-hover:gap-2 transition-all">
            Open <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/interview-prep"
          className="glass-panel p-6 rounded-2xl shadow-sm hover:scale-[1.02] transition duration-300 flex flex-col gap-4 group"
        >
          <div className="p-3 bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20 shadow-inner w-fit">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg dark:text-white mb-1">Interview Prep</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Generate technical and behavioral interview questions for any designation and experience level.
            </p>
          </div>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 mt-auto group-hover:gap-2 transition-all">
            Open <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/convert"
          className="glass-panel p-6 rounded-2xl shadow-sm hover:scale-[1.02] transition duration-300 flex flex-col gap-4 group"
        >
          <div className="p-3 bg-emerald-550/10 text-emerald-600 dark:text-emerald-450 rounded-xl border border-emerald-500/20 shadow-inner w-fit">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg dark:text-white mb-1">Document Converter</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Convert files between PDF and Word, either direction.
            </p>
          </div>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 mt-auto group-hover:gap-2 transition-all">
            Open <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-500/20 shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm dark:text-white">Cross-resume RAG search</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
              Ask a question in plain English and get an answer synthesized only from the most relevant
              candidates across every past session — inside the Resume Screener page.
            </p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
            <GitCompareArrows className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm dark:text-white">Find Similar Candidates</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
              Liked a candidate? Find others like them across every screening session, ranked by real
              semantic similarity.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
