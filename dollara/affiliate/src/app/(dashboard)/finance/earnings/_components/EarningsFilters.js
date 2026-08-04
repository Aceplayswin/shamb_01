'use client';

import { Search } from 'lucide-react';

export default function EarningsFilters({
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  search,
  onSearchChange
}) {
  const types = ['All', 'Revenue Share', 'CPA', 'Override'];
  const statuses = ['All', 'Pending', 'Approved', 'Paid', 'Clawed Back'];

  const selectCls = 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 transition-colors';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Search by date or txn */}
      <div className="relative max-w-xs flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by period / tx ref..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
        />
      </div>




      {/* Select boxes */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Type:</span>
          <select value={typeFilter} onChange={(e) => onTypeChange(e.target.value)} className={selectCls}>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>




        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
          <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className={selectCls}>
            {statuses.map((s) => (
              <option key={s} value={s.toLowerCase().replace(' ', '_')}>{s}</option>
            ))}
          </select>

          
        </div>
      </div>
    </div>
  );
}
