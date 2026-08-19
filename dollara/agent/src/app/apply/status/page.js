'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CircleHelp, Clock, Search, XCircle } from 'lucide-react';
import { PublicFooter, PublicHeader } from '../../_components/PublicShell';
import { fetchApplicationStatus } from '../../../services/agentApi';
import { fmtDateTime } from '../../../lib/format';

// How each status is presented. Kept as data so the component below stays one
// branch rather than five.
const PRESENTATION = {
  pending: {
    tone: 'text-amber-300',
    ring: 'border-amber-400/40 bg-amber-400/10',
    icon: Clock,
    title: 'Pending review',
    body: 'Your application is with your upline. You will be able to sign in as soon as it is approved.',
  },
  info_requested: {
    tone: 'text-amber-300',
    ring: 'border-amber-400/40 bg-amber-400/10',
    icon: AlertCircle,
    title: 'More information needed',
    body: 'Your reviewer has asked for more detail before deciding. Get in touch with whoever referred you.',
  },
  active: {
    tone: 'text-up',
    ring: 'border-up/40 bg-up/10',
    icon: Search,
    title: 'Approved',
    body: 'Your account is live. Sign in with the username and password you chose when you applied.',
  },
  rejected: {
    tone: 'text-down',
    ring: 'border-down/40 bg-down/10',
    icon: XCircle,
    title: 'Not approved',
    body: 'This application was declined.',
  },
  unknown: {
    tone: 'text-ink-muted',
    ring: 'border-hairline bg-panel-sunken',
    icon: CircleHelp,
    title: 'No application found',
    body: 'We have nothing on file for that email address. Check the spelling, or apply for an account.',
  },
};

// Suspended, locked and closed are real states an approved account can be in.
// They are not application outcomes, so they get one shared presentation rather
// than pretending the application is still open.
const CLOSED_STATES = ['suspended', 'locked', 'closed'];

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await fetchApplicationStatus(email.trim()));
    } catch (err) {
      setError(err.message || 'Could not check that address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const view = result
    ? PRESENTATION[result.status]
      ?? (CLOSED_STATES.includes(result.status)
        ? {
            tone: 'text-down',
            ring: 'border-down/40 bg-down/10',
            icon: XCircle,
            title: result.statusLabel ?? 'Account unavailable',
            body: 'This account is not currently active. Contact your upline.',
          }
        : PRESENTATION.unknown)
    : null;
  const Icon = view?.icon;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader active="status" />

      <main className="flex-1 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg animate-fade-up">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Check your application</h1>
            <p className="mt-3 text-sm text-ink-muted">
              Enter the email address you applied with.
            </p>
          </div>

          <form onSubmit={onSubmit} className="card mt-8 p-6">
            {error && (
              <div className="mb-5 flex items-start gap-2 rounded border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <label htmlFor="status-email" className="field-label">
              Email address
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                id="status-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field flex-1"
              />
              <button type="submit" disabled={loading} className="btn-primary">
                <Search className="h-4 w-4" />
                {loading ? 'Checking…' : 'Check'}
              </button>
            </div>
          </form>

          {view && (
            <div className={`mt-6 rounded border p-6 ${view.ring}`}>
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${view.tone}`} />
                <div className="min-w-0">
                  <h2 className={`text-lg font-semibold ${view.tone}`}>
                    {view.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {view.body}
                  </p>

                  {result.rejectionReason && (
                    <p className="mt-3 rounded bg-black/20 px-3 py-2 text-sm text-ink">
                      <span className="text-ink-faint">Reason: </span>
                      {result.rejectionReason}
                    </p>
                  )}

                  <dl className="mt-4 space-y-1.5 text-sm">
                    {result.appliedAt && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-faint">Applied</dt>
                        <dd className="text-ink">{fmtDateTime(result.appliedAt)}</dd>
                      </div>
                    )}
                    {result.approvedAt && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-faint">Approved</dt>
                        <dd className="text-ink">{fmtDateTime(result.approvedAt)}</dd>
                      </div>
                    )}
                    {result.code && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-faint">Your agent code</dt>
                        <dd className="font-mono text-ink">{result.code}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {result.status === 'active' ? (
                      <Link href="/login" className="btn-primary">
                        Sign in
                      </Link>
                    ) : result.status === 'unknown' ? (
                      <Link href="/apply" className="btn-primary">
                        Apply for an account
                      </Link>
                    ) : null}
                    <Link href="/" className="btn-ghost">
                      Back to home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
