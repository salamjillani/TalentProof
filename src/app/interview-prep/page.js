"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '@/components/Layout';
import { 
  Sparkles, 
  Briefcase, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  CheckCircle2, 
  HelpCircle, 
  GraduationCap, 
  Award,
  Plus,
  Minus,
  FileText
} from 'lucide-react';

export default function InterviewPrepPage() {
  const { showToast } = useToast();

  const [designation, setDesignation] = useState('');
  const [experience, setExperience] = useState('1 Year');
  const [skills, setSkills] = useState('');
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState([]);
  
  // Track expanded question cards
  const [expandedIndices, setExpandedIndices] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [guideCopied, setGuideCopied] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!designation.trim()) {
      showToast('Please specify a job designation (e.g. MERN Stack Developer).', 'warning');
      return;
    }

    setGenerating(true);
    setQuestions([]);
    setExpandedIndices([]);
    
    try {
      showToast('Generating customized interview preparation guide...', 'info');
      const response = await axios.post('/api/interview-prep', {
        designation,
        experience,
        skills
      });

      if (response.data.success) {
        setQuestions(response.data.questions);
        showToast('Successfully generated questions and answers!', 'success');
        // Expand the first question by default
        if (response.data.questions.length > 0) {
          setExpandedIndices([0]);
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Generation failed. Verify API configuration.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = (index) => {
    if (expandedIndices.includes(index)) {
      setExpandedIndices(prev => prev.filter(i => i !== index));
    } else {
      setExpandedIndices(prev => [...prev, index]);
    }
  };

  const handleCopyQuestion = (index, qText, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(qText);
    setCopiedIndex(index);
    showToast('Question copied to clipboard!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyFullGuide = () => {
    if (questions.length === 0) return;
    
    let text = `### AI Interview Prep Guide: ${designation} (${experience} Experience)\n`;
    if (skills) text += `Key Technologies: ${skills}\n`;
    text += `\n=========================================\n\n`;

    questions.forEach((q, idx) => {
      text += `Q${idx + 1} [${q.type} - ${q.difficulty}]: ${q.question}\n\n`;
      text += `Recommended Talking Points:\n`;
      q.talkingPoints?.forEach(p => {
        text += `- ${p}\n`;
      });
      text += `\n-----------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(text);
    setGuideCopied(true);
    showToast('Full Markdown preparation guide copied!', 'success');
    setTimeout(() => setGuideCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Title */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          Interview Prep & Question Generator
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
          Generate realistic AI-powered technical and behavioral interview questions customized to specific job designations and experience levels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Parameters */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleGenerate} className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-lg font-bold dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
              <Briefcase className="w-5 h-5 text-brand-500" />
              <span>Target Role Details</span>
            </h2>

            {/* Target Designation */}
            <div className="space-y-2">
              <label htmlFor="designation" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Designation / Job Title
              </label>
              <input
                type="text"
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Frontend React Developer"
                disabled={generating}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-250"
              />
            </div>

            {/* Experience Selection */}
            <div className="space-y-2">
              <label htmlFor="experience" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Experience Level
              </label>
              <select
                id="experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                disabled={generating}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition font-medium text-slate-800 dark:text-slate-250 cursor-pointer"
              >
                <option value="1 Year">1 Year (Entry Level)</option>
                <option value="2 Years">2 Years (Junior)</option>
                <option value="3 Years">3 Years (Mid-level)</option>
                <option value="4 Years">4 Years (Senior-Associate)</option>
                <option value="5+ Years">5+ Years (Lead / Architect)</option>
              </select>
            </div>

            {/* Skills & Technologies */}
            <div className="space-y-2">
              <label htmlFor="skills" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Core Technologies / Skills (Optional)
              </label>
              <input
                type="text"
                id="skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Next.js, Redux Toolkit, Tailwind"
                disabled={generating}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-inner font-medium text-slate-800 dark:text-slate-255"
              />
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              disabled={generating || !designation.trim()}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Generating Preparation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Generated Questions Output */}
        <div className="lg:col-span-2 space-y-6">
          {generating ? (
            <div className="glass-panel p-12 rounded-2xl shadow-sm text-center space-y-4">
              <div className="inline-flex p-3.5 bg-brand-500/10 text-brand-655 rounded-full animate-spin border border-brand-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">
                Curating Interview Guidelines
              </h3>
              <p className="text-xs text-slate-405 max-w-xs mx-auto leading-relaxed">
                Analyzing core tech concepts for "{designation}" matching the "{experience}" level difficulty. Preparing talking tips...
              </p>
              
              {/* Fake Skeleton placeholders */}
              <div className="space-y-3 pt-6 max-w-md mx-auto opacity-40">
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl shadow-sm text-center space-y-4 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 dark:border-slate-800 min-h-[300px]">
              <div className="p-3 bg-brand-500/5 dark:bg-brand-500/10 text-brand-555 border border-brand-500/10 rounded-xl mb-1">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-md text-slate-700 dark:text-slate-200">
                No Prep Guide Active
              </h3>
              <p className="text-xs text-slate-405 max-w-sm leading-relaxed font-semibold">
                Specify your target position and experience in the form on the left, then click Generate to construct customized questions.
              </p>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6 animate-slide-up">
              
              {/* Header metadata */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Preparation Package</span>
                  <h3 className="font-extrabold text-base dark:text-white mt-0.5">{designation} Guide</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-bold">
                    <Clock className="w-3.5 h-3.5 text-brand-500" />
                    <span>{experience} level</span>
                    {skills && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">Tech: {skills}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleCopyFullGuide}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-950 dark:bg-slate-950 dark:hover:bg-black text-white text-xs font-bold rounded-lg border border-slate-205 dark:border-slate-805 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {guideCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Full Guide</span>
                </button>
              </div>

              {/* Questions Accordion List */}
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const isExpanded = expandedIndices.includes(idx);
                  return (
                    <div 
                      key={idx}
                      className="border border-slate-205 dark:border-slate-805 rounded-xl bg-slate-50/20 dark:bg-slate-900/10 overflow-hidden hover:border-brand-500/20 transition duration-150"
                    >
                      {/* Card Header clickable toggle */}
                      <div 
                        onClick={() => toggleExpand(idx)}
                        className="p-4 flex items-start justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex gap-3 min-w-0">
                          <span className={`
                            w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] border mt-0.5
                            ${q.type === 'Technical' 
                              ? 'bg-brand-500/10 text-brand-655 border-brand-500/20' 
                              : 'bg-indigo-500/10 text-indigo-650 border-indigo-500/20'
                            }
                          `}>
                            {idx + 1}
                          </span>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                q.type === 'Technical' 
                                  ? 'bg-brand-500/5 text-brand-500 border border-brand-500/10'
                                  : 'bg-indigo-500/5 text-indigo-500 border border-indigo-500/10'
                              }`}>
                                {q.type}
                              </span>
                              
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-555' :
                                q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-555' :
                                'bg-rose-500/10 text-rose-555'
                              }`}>
                                {q.difficulty}
                              </span>
                            </div>
                            
                            <h4 className="font-extrabold text-sm dark:text-slate-150 leading-snug">
                              {q.question}
                            </h4>
                          </div>
                        </div>

                        {/* Top corner actions */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleCopyQuestion(idx, q.question, e)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-205 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition cursor-pointer"
                            title="Copy Question text"
                          >
                            {copiedIndex === idx ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <div 
                            onClick={() => toggleExpand(idx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-205 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Card Content: Sample Answers Outlines */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/40 text-xs space-y-3 animate-fade-in">
                          <div className="space-y-2">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-brand-500" />
                              AI Recommended Answer Guidelines
                            </span>
                            <div className="space-y-2">
                              {q.talkingPoints?.map((point, pIdx) => (
                                <div key={pIdx} className="flex gap-2.5 items-start leading-relaxed text-slate-650 dark:text-slate-350 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                                  <span>{point}</span>
                                </div>
                              ))}
                              {(!q.talkingPoints || q.talkingPoints.length === 0) && (
                                <p className="italic text-slate-400">No talking points provided.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
