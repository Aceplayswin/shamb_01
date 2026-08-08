'use client';

export default function StatusFilter({ current, onChange, counts }) {
  const statuses = [
    { key: 'all',     label: 'All',     color: 'bg-slate-500' },
    { key: 'active',  label: 'Active',  color: 'bg-emerald-500' },
    { key: 'dormant', label: 'Dormant', color: 'bg-amber-500' },
    { key: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  ];





  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {statuses.map(({ key, label, color }) => {
        const isActive = current === key;
        const count = key === 'all' ? counts.total : (counts[key] || 0);
        return (


          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label}
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              isActive
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              {count}
            </span>
          </button>

          
        );
      })}
    </div>
  );
}
