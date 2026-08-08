'use client';

import { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, CheckCircle } from 'lucide-react';

export default function StatementsModal({ onClose }) {
  const [period, setPeriod] = useState('current');
  const [format, setFormat] = useState('pdf');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const periods = [
    { value: 'current', label: 'Current Month (Aug 2026)' },
    { value: 'last',    label: 'Last Month (Jul 2026)' },
    { value: 'ytd',     label: 'Year to Date (2026)' },
  ];




  const handleExport = (e) => {
    e.preventDefault();
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setDone(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 1800);
  };





  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2';

  return (


    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">Export Statements</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>




        {done ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-bounce">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Export Successful!</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Your ledger file is downloading...</p>
            </div>
          </div>


        ) : (
          <form onSubmit={handleExport} className="space-y-4">
            {/* Period select */}
            <div>
              <label className={labelCls}>Statement Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
              >
                {periods.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>




            {/* Format choice */}
            <div>
              <label className={labelCls}>File Format</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                    format === 'pdf'
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/40 text-rose-700 dark:text-rose-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >



                  <FileText className="w-5 h-5 text-rose-500" /> PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                    format === 'csv'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >



                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> CSV Spreadsheet
                </button>
              </div>
            </div>


            {/* Export button */}


            <button
              type="submit"
              disabled={exporting}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-xs shadow-sm hover:shadow-md hover:brightness-105 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {exporting ? (
                <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Preparing...</>
              ) : (
                <><Download className="w-4 h-4" /> Download Statement</>
              )}



            </button>



          </form>
        )}
      </div>


    </div>
  );
}
