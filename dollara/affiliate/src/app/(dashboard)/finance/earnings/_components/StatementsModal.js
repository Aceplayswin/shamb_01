'use client';

import { useMemo, useState } from 'react';
import { X, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { affiliateDownload } from '../../../../../services/affiliateApi';

export default function StatementsModal({ onClose }) {
  const [period, setPeriod] = useState('current');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Period labels are computed, not written in — the previous hardcoded
  // "Aug 2026 / Jul 2026" would have been wrong in every other month.
  const periods = useMemo(() => {
    const now = new Date();
    const monthName = (d) => d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [
      { value: 'current', label: `Current month (${monthName(now)})` },
      { value: 'last', label: `Last month (${monthName(lastMonth)})` },
      { value: 'ytd', label: `Year to date (${now.getFullYear()})` },
      { value: 'all', label: 'All time' },
    ];
  }, []);

  const rangeFor = (value) => {
    const now = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    if (value === 'current') {
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    }
    if (value === 'last') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(first), to: iso(last) };
    }
    if (value === 'ytd') {
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
    }
    return { from: '2000-01-01', to: iso(now) };
  };

  /**
   * Fetch the statement and save it.
   *
   * This used to be two nested setTimeouts and a success screen — it produced
   * no file whatsoever. The blob dance is required rather than a plain
   * `<a download>` because the endpoint needs the Authorization header.
   */
  const handleExport = async (e) => {
    e.preventDefault();
    if (exporting) return;
    setExporting(true);
    setError('');

    const { from, to } = rangeFor(period);
    try {
      await affiliateDownload(
        `/api/v1/affiliate/earnings/export?from=${from}&to=${to}`,
        `statement-${from}-to-${to}.csv`,
      );
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message || 'Could not prepare your statement.');
    } finally {
      setExporting(false);
    }
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
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  CSV spreadsheet
                </span>
                <span className="mt-1 block font-normal text-emerald-600/80 dark:text-emerald-500/80">
                  Opens in Excel, Sheets or any accounting package.
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
