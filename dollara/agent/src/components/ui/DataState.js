'use client';

import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

/**
 * The four states every data screen has, in one component.
 *
 * The distinction that matters on this panel: a request in flight, an empty
 * result and a failed request must never look alike. "No Records Found" under
 * a P&L report is a statement about the book; a swallowed error that renders
 * the same way is a lie about it.
 */
export function DataState({
  loading,
  error,
  empty,
  onRetry,
  children,
  skeleton,
  emptyLabel = 'No Records Found',
  colSpan,
}) {
  if (loading) {
    return skeleton ?? <TableSkeleton />;
  }

  if (error) {
    const body = (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <AlertTriangle className="h-7 w-7 text-down" />
        <div>
          <p className="font-semibold text-ink">Could not load this</p>
          <p className="mt-1 text-sm text-ink-muted">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded border border-hairline px-4 py-2 text-sm font-medium text-ink transition hover:bg-panel-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    );
    // Inside a table this has to be a real cell, or the browser hoists it out
    // of the <tbody> and the layout collapses.
    return colSpan ? (
      <tr>
        <td colSpan={colSpan}>{body}</td>
      </tr>
    ) : (
      body
    );
  }

  if (empty) {
    const body = (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <Inbox className="h-6 w-6 text-ink-faint" />
        <p className="text-sm text-ink-muted">{emptyLabel}</p>
      </div>
    );
    return colSpan ? (
      <tr>
        <td colSpan={colSpan}>{body}</td>
      </tr>
    ) : (
      body
    );
  }

  return children;
}

export function TableSkeleton({ rows = 5, cols = 6, colSpan }) {
  const body = (
    <div className="divide-y divide-hairline/60">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3.5 flex-1 animate-pulse rounded bg-panel-head"
              style={{ animationDelay: `${(r + c) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
  return colSpan ? (
    <tr>
      <td colSpan={colSpan}>{body}</td>
    </tr>
  ) : (
    body
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded bg-panel"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
