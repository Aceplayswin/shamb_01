'use client';

import { X } from 'lucide-react';

export default function QrCodeModal({ link, onClose }) {
  const url = `https://dollara.com${link.target}?ref=DLR-AF7X92&sub=${link.sub}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-up text-center">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">QR Code</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated QR code block */}
        <div className="mx-auto w-48 h-48 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-3">
          <svg viewBox="0 0 100 100" className="w-28 h-28 text-slate-800 dark:text-slate-200">
            {/* Simplified QR-like pattern */}
            <rect x="5" y="5" width="25" height="25" rx="3" fill="currentColor"/>
            <rect x="70" y="5" width="25" height="25" rx="3" fill="currentColor"/>
            <rect x="5" y="70" width="25" height="25" rx="3" fill="currentColor"/>
            <rect x="10" y="10" width="15" height="15" rx="2" fill="white" className="dark:fill-slate-900"/>
            <rect x="75" y="10" width="15" height="15" rx="2" fill="white" className="dark:fill-slate-900"/>
            <rect x="10" y="75" width="15" height="15" rx="2" fill="white" className="dark:fill-slate-900"/>
            <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor"/>
            <rect x="79" y="14" width="7" height="7" rx="1" fill="currentColor"/>
            <rect x="14" y="79" width="7" height="7" rx="1" fill="currentColor"/>
            {/* Data modules */}
            <rect x="35" y="5" width="5" height="5" fill="currentColor"/>
            <rect x="45" y="5" width="5" height="5" fill="currentColor"/>
            <rect x="55" y="5" width="5" height="5" fill="currentColor"/>
            <rect x="35" y="15" width="5" height="5" fill="currentColor"/>
            <rect x="50" y="15" width="5" height="5" fill="currentColor"/>
            <rect x="35" y="25" width="5" height="5" fill="currentColor"/>
            <rect x="45" y="25" width="5" height="5" fill="currentColor"/>
            <rect x="55" y="25" width="5" height="5" fill="currentColor"/>
            <rect x="5" y="35" width="5" height="5" fill="currentColor"/>
            <rect x="15" y="35" width="5" height="5" fill="currentColor"/>
            <rect x="25" y="35" width="5" height="5" fill="currentColor"/>
            <rect x="40" y="40" width="20" height="20" rx="4" fill="currentColor"/>
            <rect x="44" y="44" width="12" height="12" rx="2" fill="white" className="dark:fill-slate-900"/>
            <rect x="47" y="47" width="6" height="6" rx="1" fill="currentColor"/>
            <rect x="70" y="35" width="5" height="5" fill="currentColor"/>
            <rect x="80" y="40" width="5" height="5" fill="currentColor"/>
            <rect x="90" y="35" width="5" height="5" fill="currentColor"/>
            <rect x="5" y="50" width="5" height="5" fill="currentColor"/>
            <rect x="20" y="55" width="5" height="5" fill="currentColor"/>
            <rect x="70" y="55" width="5" height="5" fill="currentColor"/>
            <rect x="85" y="50" width="5" height="5" fill="currentColor"/>
            <rect x="35" y="70" width="5" height="5" fill="currentColor"/>
            <rect x="45" y="75" width="5" height="5" fill="currentColor"/>
            <rect x="55" y="70" width="5" height="5" fill="currentColor"/>
            <rect x="70" y="70" width="5" height="5" fill="currentColor"/>
            <rect x="80" y="80" width="5" height="5" fill="currentColor"/>
            <rect x="90" y="90" width="5" height="5" fill="currentColor"/>
            <rect x="35" y="85" width="5" height="5" fill="currentColor"/>
            <rect x="50" y="90" width="5" height="5" fill="currentColor"/>
            <rect x="60" y="85" width="5" height="5" fill="currentColor"/>
          </svg>
        </div>

        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-3 break-all px-4">{url}</p>

        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{link.name}</p>

        <div className="mt-5 flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-xs shadow-sm hover:shadow-md hover:brightness-105 transition-all">
            Download PNG
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Close
          </button>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-400 font-bold">Phase 1 Mock</span> — Real QR generation in Phase 2
        </p>
      </div>
    </div>
  );
}
