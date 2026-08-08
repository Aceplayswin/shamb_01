'use client';

import { Search, ChevronRight } from 'lucide-react';




const KYC_STYLES = {
  Verified: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
  Pending:  'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
  Rejected: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
};




const STATUS_STYLES = {
  active:  'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
  dormant: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
  blocked: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
};




export default function ReferralTable({ players, search, onSearchChange, onSelect }) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Player ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
        />
      </div>




      {/* Table */}
      <div className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Player</th>
                <th className="p-4">Signup</th>
                <th className="p-4">KYC</th>
                <th className="p-4">FTD Date</th>
                <th className="p-4">FTD Amt</th>
                <th className="p-4">Lifetime Dep.</th>
                <th className="p-4">Commission</th>
                <th className="p-4">Status</th>
                <th className="p-4 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {players.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  <td className="p-4">
                    <span className="font-bold text-slate-900 dark:text-slate-100">#{p.id}</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.country}</span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{p.signupDate}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${KYC_STYLES[p.kyc]}`}>
                      {p.kyc}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{p.ftdDate || '—'}</td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{p.ftdAmount > 0 ? `$${p.ftdAmount}` : '—'}</td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200">${p.lifetimeDeposits.toLocaleString()}</td>
                  <td className="p-4 font-bold text-brand-600 dark:text-brand-400 font-display">${p.commission.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No players match your filters.</td></tr>
              )}
            </tbody>
          </table>




          
        </div>
      </div>
    </div>
  );
}
