'use client';

const STATUS_BADGES = {
  paid:        'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
  approved:    'bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/30',
  pending:     'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
  clawed_back: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
};

const STATUS_LABELS = {
  paid:        'paid',
  approved:    'approved',
  pending:     'pending',
  clawed_back: 'clawed back',
};

export default function EarningsTable({ items }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden transition-colors duration-300">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-4">Tx Ref</th>
              <th className="p-4">Period</th>
              <th className="p-4">Type</th>
              <th className="p-4">Commission Base</th>
              <th className="p-4">Rate</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-4 font-mono font-bold text-slate-400 dark:text-slate-500">{e.id}</td>
                <td className="p-4 text-slate-700 dark:text-slate-300 font-semibold">{e.period}</td>
                <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{e.type}</td>
                <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{e.base}</td>
                <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">{e.rate}</td>
                <td className={`p-4 font-black font-display text-sm ${e.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                  {e.amount >= 0 ? `+$${e.amount.toLocaleString()}` : `-$${Math.abs(e.amount).toLocaleString()}`}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize whitespace-nowrap ${STATUS_BADGES[e.status]}`}>
                    {STATUS_LABELS[e.status]}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No earnings items match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
