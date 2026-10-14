import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-center">
      <p className="font-display text-5xl font-bold text-white">404</p>
      <p className="text-sm text-slate-400">This console page does not exist.</p>
      <Link
        href="/"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
