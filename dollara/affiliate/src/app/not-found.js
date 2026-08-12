import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F6FA] px-6 text-center dark:bg-slate-950">
      <Compass className="h-10 w-10 text-slate-400" />
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          That link does not lead anywhere in the partner portal.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
