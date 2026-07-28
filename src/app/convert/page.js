"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/components/Layout';
import { 
  RefreshCw, 
  Upload, 
  Download, 
  ArrowRightLeft, 
  FileText,
  AlertTriangle,
  History,
  Trash2,
  Calendar,
  HardDrive
} from 'lucide-react';

export default function ConvertPage() {
  const { showToast } = useToast();
  
  const [dragActive, setDragActive] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Conversion history logs
  const [conversions, setConversions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get('/api/documents/convert-history');
      if (res.data.success) {
        setConversions(res.data.conversions);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load conversion log history.', 'error');
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleConversion(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleConversion(e.target.files[0]);
    }
  };

  const handleConversion = async (file) => {
    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();
    
    if (ext !== 'pdf' && ext !== 'docx') {
      showToast('Unsupported file type. Please upload a PDF or DOCX file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', ext === 'pdf' ? 'docx' : 'pdf');

    setConverting(true);
    setProgress(0);
    setStatusMessage('Uploading document...');

    try {
      showToast('Starting conversion...', 'info');
      
      const targetExt = ext === 'pdf' ? 'docx' : 'pdf';
      const outputFilename = `${name.substring(0, name.lastIndexOf('.'))}.${targetExt}`;
      
      const response = await axios.post('/api/documents/convert', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
          if (percentCompleted === 100) {
            setStatusMessage('Converting document (this may take a few seconds)...');
          }
        }
      });

      setStatusMessage('Downloading converted file...');
      
      // Create local URL for the downloaded blob
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] 
      });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', outputFilename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up link and object URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Successfully converted to ${targetExt.toUpperCase()}!`, 'success');
      
      // Refresh conversion logs history
      fetchHistory();
    } catch (err) {
      console.error(err);
      showToast('Conversion failed. Ensure formatting is supported.', 'error');
    } finally {
      setConverting(false);
      setProgress(0);
      setStatusMessage('');
    }
  };

  const handleDeleteLog = async (id, name, e) => {
    e.stopPropagation();
    if (!confirm(`Delete conversion record for "${name}"? This unlinks the file from disk.`)) {
      return;
    }
    try {
      const res = await axios.delete(`/api/documents/convert-history/${id}`);
      if (res.data.success) {
        showToast('Conversion log deleted.', 'success');
        setConversions(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete conversion log.', 'error');
    }
  };

  const handleDownloadLog = (id, targetName) => {
    window.open(`/api/documents/convert-history/${id}`, '_blank');
    showToast(`Downloading "${targetName}"...`, 'info');
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-indigo-300">
          Document Converter
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-base">
          Convert PDF documents to editable DOCX, and DOCX files to PDF. Completely local and secure offline processing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Converter Zone */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-2xl shadow-sm">
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`
                w-full py-20 px-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative
                ${dragActive 
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-900/10 scale-[0.99] shadow-inner' 
                  : 'border-slate-300 hover:border-brand-400 dark:border-slate-805 dark:hover:border-slate-700/60'
                }
              `}
            >
              {converting ? (
                <div className="w-full max-w-md text-center space-y-4">
                  <div className="inline-flex p-3 bg-brand-500/10 text-brand-655 rounded-full animate-spin border border-brand-500/25">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                      {statusMessage}
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-805 h-2.5 rounded-full overflow-hidden">
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
                    id="convert-input"
                    className="hidden"
                    accept=".pdf,.docx"
                    onChange={handleFileInputChange}
                  />
                  <label 
                    htmlFor="convert-input" 
                    className="absolute inset-0 w-full h-full cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-4 text-slate-400 mb-6 bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl group-hover:scale-105 transition duration-200 border border-slate-200/40 dark:border-slate-850">
                    <FileText className="w-8 h-8 text-rose-500" />
                    <ArrowRightLeft className="w-5 h-5 text-slate-400" />
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="font-extrabold text-lg mb-1 text-slate-700 dark:text-slate-200">
                    Upload file to convert
                  </h3>
                  <p className="text-sm text-slate-400 text-center max-w-sm mb-4 font-medium">
                    PDF files convert to editable DOCX. DOCX files render directly to standard PDF.
                  </p>
                  <button 
                    type="button"
                    className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-500/10 pointer-events-none z-20"
                  >
                    Select File
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Instructions / Details */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-bold text-md flex items-center gap-2 dark:text-white">
              <Download className="w-5 h-5 text-brand-500" />
              Conversion Operations
            </h2>
            
            <div className="space-y-3.5 text-sm leading-relaxed font-semibold">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-150/40 dark:border-slate-850 rounded-xl">
                <span className="font-bold text-slate-700 dark:text-slate-350 block mb-1">PDF to DOCX</span>
                <p className="text-xs text-slate-405 font-medium">
                  Reconstructs characters, paragraphs, and styles into standard flowing Microsoft Word blocks.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-150/40 dark:border-slate-850 rounded-xl">
                <span className="font-bold text-slate-700 dark:text-slate-355 block mb-1">DOCX to PDF</span>
                <p className="text-xs text-slate-405 font-medium">
                  Renders standard page layout grids, tables, and styling configurations directly into a portable PDF document.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/15 p-5 rounded-2xl flex gap-3 text-sm leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1">Dual Engine Processing</span>
              If headless LibreOffice is active on this system, we process using native document engines. Otherwise, the app falls back to pure JavaScript reconstruction.
            </div>
          </div>
        </div>

      </div>

      {/* Conversion logs history */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
        <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-brand-500" />
          <span>Conversions Log History</span>
        </h2>

        {loadingHistory ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : conversions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-205 dark:border-slate-805 rounded-xl text-slate-400 text-sm font-semibold">
            No conversions logged in this session yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-5">Original File</th>
                    <th className="py-3 px-5">Converted Format</th>
                    <th className="py-3 px-5">File Size</th>
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm font-semibold">
                  {conversions.map(item => (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition duration-150"
                    >
                      <td className="py-3 px-5 text-slate-700 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-500" />
                          <span className="truncate max-w-xs">{item.originalName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          item.targetFormat === 'pdf' 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15'
                        }`}>
                          {item.targetFormat}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-450">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>{formatSize(item.size)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-slate-455">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(item.timestamp)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDownloadLog(item.id, item.targetName)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 rounded-lg transition cursor-pointer"
                            title="Download Converted Document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteLog(item.id, item.originalName, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
