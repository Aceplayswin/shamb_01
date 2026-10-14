'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F6FA] px-6 text-center dark:bg-slate-950">
      <AlertTriangle className="h-10 w-10 text-danger-400" />
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Something went wrong
        </h1>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {error?.message || 'An unexpected error occurred while loading this page.'}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
