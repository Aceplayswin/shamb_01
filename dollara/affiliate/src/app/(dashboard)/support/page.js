'use client';

import { useState } from 'react';
import { LifeBuoy, Loader2, AlertCircle } from 'lucide-react';
import { affiliateApi } from '../../../services/affiliateApi';
import { useAffiliateData } from '../../../hooks/useAffiliateData';
import { DataState } from '../../../components/ui/DataState';
import { toast } from '../../../lib/toast';
import { fmtDateShort, label as humanize } from '../../../lib/format';

const CATEGORIES = [
  { value: 'payout', label: 'Payout' },
  { value: 'commission', label: 'Commission' },
  { value: 'tracking', label: 'Tracking & links' },
  { value: 'account', label: 'Account' },
  { value: 'api', label: 'API & integration' },
  { value: 'other', label: 'Other' },
];

export default function SupportPage() {
  const { data, loading, error, reload } = useAffiliateData(
    '/api/v1/affiliate/support/tickets?limit=50',
    [],
  );
  const [form, setForm] = useState({
    subject: '',
    message: '',
    priority: 'normal',
    category: 'other',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const tickets = data?.records ?? [];

  const submitTicket = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError('');

    try {
      await affiliateApi('/api/v1/affiliate/support/tickets', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Ticket created — support will reply by email');
      setForm({ subject: '', message: '', priority: 'normal', category: 'other' });
      reload();
    } catch (err) {
      setFormError(err.message || 'Could not create that ticket.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-6 animate-fade-up">

      {/* page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Support
          </h1>
          <p className="text-xs text-slate-500 mt-1">
Raise an issue with the partner team and track its progress.
          </p>
        </div>
      </div>


      <div className="grid gap-4 lg:grid-cols-3">

        {/* new ticket form */}
        <section className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            New ticket
          </h2>

          <form onSubmit={submitTicket} className="mt-3 space-y-3">
            <input
              placeholder="Subject"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />

            <textarea
              placeholder="Message"
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              rows={6}
            />

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 font-semibold text-black disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create ticket
              </button>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </form>
        </section>


        {/* recent tickets list */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Recent tickets
          </h2>

          <DataState
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!tickets.length}
            emptyTitle="No tickets yet"
            emptyHint="Anything you raise appears here with its current status."
            emptyIcon={LifeBuoy}
          >
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {tickets.map((t) => (
                <div key={t.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {t.subject}
                      </div>
                      <div className="text-xs text-slate-500">
                        #{t.id} • {fmtDateShort(t.created_at)} • {humanize(t.status)}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                        t.priority === 'high'
                          ? 'bg-rose-500/10 text-rose-600'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>

                  <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {humanize(t.category)} · {t.message_count}{' '}
                    {t.message_count === 1 ? 'message' : 'messages'}
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        </section>

      </div>

    </div>
  );
}