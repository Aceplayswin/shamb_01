'use client';

import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

/**
 * The four states every data screen has, in one component.
 *
 * Before this the portal had none of them: a request in flight looked identical
 * to an empty result, and a failed request looked like "you have no data" —
 * which for an earnings page is a genuinely alarming thing to show someone.
 *
 * Usage:
 *   <DataState loading={loading} error={error} empty={!rows.length} onRetry={reload}>
 *     {...}
 *   </DataState>
 */
export function DataState({
  loading,
  error,
  empty,
  onRetry,
  children,
  skeleton,
  emptyTitle = 'Nothing here yet',
  emptyHint,
  emptyIcon: EmptyIcon = Inbox,
}) {
  if (loading) {
    return skeleton ?? <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger-400/30 bg-danger-500/5 px-6 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-danger-400" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            Could not load this
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
        <EmptyIcon className="h-8 w-8 text-slate-400" />
        <p className="font-medium text-slate-700 dark:text-slate-200">{emptyTitle}</p>
        {emptyHint && (
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {emptyHint}
          </p>
        )}
      </div>
    );
  }

  return children;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                style={{ animationDelay: `${(r + c) * 60}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
