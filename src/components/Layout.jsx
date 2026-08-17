"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  RefreshCw,
  Moon,
  Sun,
  LayoutDashboard,
  Menu,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Kanban
} from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export default function Layout({ children }) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile drawer
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop collapse
  const [toasts, setToasts] = useState([]);

  // Initialize theme and sidebar collapse from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark));

    const savedCollapse = localStorage.getItem('sidebar-collapsed');
    setIsCollapsed(savedCollapse === 'true');
  }, []);

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', newState.toString());
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Summarizer', path: '/summarize', icon: Sparkles },
    { name: 'Resume Screener', path: '/resumes', icon: Users },
    { name: 'Pipeline', path: '/pipeline', icon: Kanban },
    { name: 'Interview Prep', path: '/interview-prep', icon: HelpCircle },
    { name: 'Converter', path: '/convert', icon: RefreshCw }
  ];

  // /apply is the public, candidate-facing route — it must never show the
  // internal recruiter sidebar/nav to someone outside the company applying
  // for a job. Everything else keeps the normal dashboard chrome.
  const isPublicRoute = pathname?.startsWith('/apply');
  if (isPublicRoute) {
    return (
      <ToastContext.Provider value={{ showToast }}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
          {children}
        </div>
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-md w-full px-4 md:px-0">
          {toasts.map(toast => (
            <div key={toast.id} className="p-4 rounded-2xl border shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold">
              {toast.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    );
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-[#040114] text-slate-800 dark:text-slate-100 transition-colors duration-300">

        {/* Mobile Header */}
        <header className="flex items-center justify-between p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-850/50 md:hidden z-40 shadow-sm">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-brand-600 dark:text-brand-400">
            <div className="bg-brand-500/10 dark:bg-brand-500/20 p-1.5 rounded-lg">
              <FileText className="w-5 h-5 text-brand-500 animate-pulse" />
            </div>
            <span>TalentProof</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5 transition-transform rotate-0 hover:rotate-45 duration-300" /> : <Moon className="w-5 h-5 transition-transform rotate-0 hover:-rotate-12 duration-300" />}
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Open navigation"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Sidebar Overlay (Mobile) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside className={`
          fixed top-0 bottom-0 left-0 bg-white/70 dark:bg-slate-950/30 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-900/40 z-50 transform transition-all duration-300 md:static md:translate-x-0 md:flex md:flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}>
          {/* Sidebar Header */}
          <div className="p-5 flex items-center justify-between border-b border-slate-150/50 dark:border-slate-900/40 h-[73px]">
            <Link href="/" className="flex items-center gap-3 font-extrabold text-xl text-brand-600 dark:text-brand-400 min-w-0">
              <div className="bg-brand-500/10 dark:bg-brand-500/20 p-2 rounded-xl border border-brand-500/20 shadow-sm shrink-0">
                <FileText className="w-6 h-6 text-brand-500" />
              </div>
              {!isCollapsed && (
                <span className="tracking-tight animate-fade-in font-extrabold truncate">
                  TalentProof
                </span>
              )}
            </Link>

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex items-center justify-center p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-lg text-slate-400 hover:text-slate-650 transition-all shrink-0 cursor-pointer"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-905 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-6 space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 border border-brand-600/10'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-900/40'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`} />

                  {isCollapsed ? (
                    // Collapsed Tooltip
                    <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-900 dark:bg-slate-950 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-md pointer-events-none z-55 whitespace-nowrap ml-2">
                      {item.name}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold tracking-wide animate-fade-in">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-150/50 dark:border-slate-900/40 flex items-center justify-between gap-2 overflow-hidden shrink-0">
            {!isCollapsed && (
              <span className="text-xs text-slate-400 font-semibold tracking-wider animate-fade-in">TALENTPROOF</span>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`
                p-2.5 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200/40 dark:hover:border-slate-800/40 transition-all duration-300 cursor-pointer
                ${isCollapsed ? 'mx-auto' : ''}
              `}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
          {children}
        </main>

        {/* Premium Floating Toasters container */}
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-md w-full px-4 md:px-0">
          {toasts.map(toast => {
            let colors = 'bg-white border-slate-200/60 dark:bg-slate-950/85 dark:border-slate-850/55 text-slate-850 dark:text-slate-100';
            let progressColor = 'bg-slate-455';
            let Icon = Info;
            if (toast.type === 'success') {
              colors = 'bg-emerald-50/90 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-350';
              progressColor = 'bg-emerald-550';
              Icon = CheckCircle2;
            } else if (toast.type === 'error') {
              colors = 'bg-rose-50/90 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/30 text-rose-800 dark:text-rose-350';
              progressColor = 'bg-rose-550';
              Icon = XCircle;
            } else if (toast.type === 'warning') {
              colors = 'bg-amber-50/90 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/30 text-amber-800 dark:text-amber-350';
              progressColor = 'bg-amber-550';
              Icon = AlertTriangle;
            } else if (toast.type === 'info') {
              colors = 'bg-blue-50/90 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/30 text-blue-800 dark:text-blue-350';
              progressColor = 'bg-blue-550';
              Icon = Info;
            }
            return (
              <div
                key={toast.id}
                className={`
                  flex flex-col p-4 rounded-2xl border shadow-lg backdrop-blur-md animate-scale-in relative overflow-hidden
                  ${colors}
                `}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm font-semibold leading-normal">{toast.message}</div>
                </div>

                {/* Visual animated progress indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200/20">
                  <div
                    className={`h-full ${progressColor}`}
                    style={{
                      animation: `shrinkWidth ${toast.duration}ms linear forwards`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Styles for progress timer shrink inside toasts */}
      <style jsx global>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
