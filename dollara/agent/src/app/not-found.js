import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-ink-faint">404</p>
      <p className="text-ink-muted">That page is not part of the agent panel.</p>
      <Link href="/dashboard" className="btn-primary">
        Back to Home
      </Link>
    </div>
  );
}
