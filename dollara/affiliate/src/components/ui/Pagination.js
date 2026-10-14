'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Server-side pager. Every table in the portal was previously unpaginated and
 * rendered whatever the mock array happened to hold.
 *
 * `page` is zero-based.
 */
export function Pagination({ page, total, perPage, onPage, noun = 'row' }) {
  const pages = Math.max(Math.ceil(total / perPage), 1);
  if (total === 0) return null;

  const first = page * perPage + 1;
  const last = Math.min((page + 1) * perPage, total);

  // A window around the current page, so 200 pages does not render 200 buttons.
  const windowed = [];
  const start = Math.max(0, Math.min(page - 2, pages - 5));
  for (let i = start; i < Math.min(start + 5, pages); i += 1) windowed.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm">
      <p className="text-slate-500 dark:text-slate-400">
        Showing {first.toLocaleString('en-IN')}–{last.toLocaleString('en-IN')} of{' '}
        {total.toLocaleString('en-IN')} {noun}
        {total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 transition disabled:opacity-40 enabled:hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {start > 0 && <span className="px-1 text-slate-400">…</span>}
        {windowed.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`min-w-9 rounded-lg px-3 py-2 font-medium transition ${
              p === page
                ? 'bg-brand-500 text-slate-900'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {p + 1}
          </button>
        ))}
        {start + 5 < pages && <span className="px-1 text-slate-400">…</span>}
        <button
          type="button"
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 transition disabled:opacity-40 enabled:hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
