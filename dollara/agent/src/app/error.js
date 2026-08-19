'use client';

import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="h-9 w-9 text-down" />
      <div>
        <p className="text-lg font-semibold text-ink">Something went wrong</p>
        <p className="mt-1 text-sm text-ink-muted">{error?.message}</p>
      </div>
      <button type="button" onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
