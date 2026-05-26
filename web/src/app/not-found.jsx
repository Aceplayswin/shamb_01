import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-900 px-4">
      <h1 className="text-4xl font-bold text-white">404</h1>
      <p className="mt-2 text-slate-400">Page not found</p>
      <Link href="/" className="mt-6 text-brand-400 hover:underline">
        Back to Home
      </Link>
    </div>
  );
}
