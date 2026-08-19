'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { agentWrite } from '../../../services/agentApi';
import { label, money } from '../../../lib/format';
import { toast } from '../../../lib/toast';

/**
 * Approve one application onto the tree.
 *
 * Approval is where the terms are actually set — the applicant proposed
 * nothing. Level, partnership and opening credit are all decided here, which is
 * why this is a dialog rather than a one-click button.
 */
export default function ApproveModal({ application, levels, myBalance, onClose, onDone }) {
  const [form, setForm] = useState({
    level: levels[0] ?? '',
    partnership: '25',
    commissionRate: '2',
    credit: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await agentWrite(`/api/v1/agent/applications/${application.id}/approve`, {
        level: form.level,
        partnership: Number(form.partnership || 0),
        commissionRate: Number(form.commissionRate || 0),
        credit: Number(form.credit || 0),
      });
      toast.success(`${application.username} approved`);
      onDone?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Could not approve this application');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-title"
    >
      <div className="my-8 w-full max-w-lg rounded bg-panel shadow-menu">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 id="approve-title" className="text-base font-semibold text-ink">
            Approve — {application.username}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-faint transition hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5">
          {error && (
            <p className="rounded border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">
              {error}
            </p>
          )}

          <dl className="space-y-1.5 rounded bg-panel-sunken px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Name</dt>
              <dd className="text-ink">{application.name}</dd>
            </div>
            {application.companyName && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Company</dt>
                <dd className="text-ink">{application.companyName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Email</dt>
              <dd className="truncate text-ink">{application.email}</dd>
            </div>
            {application.marketRegion && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Region</dt>
                <dd className="text-ink">{application.marketRegion}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Expected players</dt>
              <dd className="text-ink">{application.expectedVolume ?? '—'}</dd>
            </div>
          </dl>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="approve-level" className="field-label">
                Level
              </label>
              <select
                id="approve-level"
                required
                value={form.level}
                onChange={set('level')}
                className="field"
              >
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {label(level)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="approve-partnership" className="field-label">
                Partnership %
              </label>
              <input
                id="approve-partnership"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.partnership}
                onChange={set('partnership')}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="approve-commission" className="field-label">
                Commission %
              </label>
              <input
                id="approve-commission"
                type="number"
                min="0"
                step="0.01"
                value={form.commissionRate}
                onChange={set('commissionRate')}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="approve-credit" className="field-label">
                Opening credit
              </label>
              <input
                id="approve-credit"
                type="number"
                min="0"
                step="0.01"
                value={form.credit}
                onChange={set('credit')}
                className="field"
              />
            </div>
          </div>

          <p className="text-xs text-ink-faint">
            Opening credit comes out of your available credit ({money(myBalance)})
            and is recorded on your transfer statement.
          </p>

          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Approving…' : 'Approve account'}
            </button>
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
