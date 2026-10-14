'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Server-side pager. `page` is zero-based, matching the API. */
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
      <p className="text-ink-muted">
        Showing {first.toLocaleString('en-IN')}–{last.toLocaleString('en-IN')} of{' '}
        {total.toLocaleString('en-IN')} {noun}
        {total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="rounded border border-hairline p-2 text-ink-muted transition disabled:opacity-40 enabled:hover:bg-panel-hover"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {start > 0 && <span className="px-1 text-ink-faint">…</span>}
        {windowed.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`min-w-9 rounded px-3 py-2 font-medium transition ${
              p === page
                ? 'bg-blue-600 text-white'
                : 'border border-hairline text-ink-muted hover:bg-panel-hover'
            }`}
          >
            {p + 1}
          </button>
        ))}
        {start + 5 < pages && <span className="px-1 text-ink-faint">…</span>}
        <button
          type="button"
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
          className="rounded border border-hairline p-2 text-ink-muted transition disabled:opacity-40 enabled:hover:bg-panel-hover"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
