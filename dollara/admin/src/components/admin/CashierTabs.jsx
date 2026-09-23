'use client';

/**
 * All / Pending / Approved / Rejected switcher for the Deposits and Withdrawals
 * screens.
 *
 * Both screens review the same kind of request and differ only in wording, so
 * the tab strip lives here rather than being copied into each page and drifting.
 * The same keys drive the Status select in each page's filter drawer, so the two
 * controls always agree.
 */

export const CASHIER_TABS = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
];

/** Status filter choices: same keys as the tabs, worded the way ops asked. */
export const CASHIER_STATUS_OPTIONS = [
  ['all', 'All'],
  ['approved', 'Success'],
  ['pending', 'Pending'],
  ['rejected', 'Rejected'],
];

/** Badge count for a tab; "All" is the sum since the counts endpoint is per-status. */
export function cashierTabCount(counts, key) {
  if (!counts) return undefined;
  if (key === 'all') {
    return (counts.pending ?? 0) + (counts.approved ?? 0) + (counts.rejected ?? 0);
  }
  return counts[key];
}

export default function CashierTabs({ tab, onChange, counts }) {
  return (
    <div className="mb-4 flex w-fit gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
      {CASHIER_TABS.map(([key, label]) => {
        const active = tab === key;
        const count = cashierTabCount(counts, key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
              active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
            {/* A count of 0 is worth showing — "nothing to action" is the
                answer an operator opening this screen is looking for. */}
            {count != null && (
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                  active ? 'bg-indigo-500/40 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
