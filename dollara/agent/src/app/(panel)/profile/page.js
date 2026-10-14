'use client';

import { useState } from 'react';
import Card from '../_components/Card';
import { useAgent } from '../../../context/AgentContext';
import { fmtDateTime, label, money, pct, signClass } from '../../../lib/format';
import { toast } from '../../../lib/toast';
import { agentWrite } from '../../../services/agentApi';

export default function ProfilePage() {
  const { me, refresh } = useAgent();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    // Checked here as well as on the server: the server cannot tell a typo in
    // the confirmation from a deliberate change, so it never sees this field.
    if (form.next !== form.confirm) {
      setError('The two new passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await agentWrite('/api/v1/agent/profile/password', {
        currentPassword: form.current,
        newPassword: form.next,
      });
      toast.success('Password changed');
      setForm({ current: '', next: '', confirm: '' });
      refresh();
    } catch (e) {
      setError(e.message || 'Could not change your password');
    } finally {
      setBusy(false);
    }
  };

  const details = [
    ['Username', me?.username],
    ['Name', me?.name],
    ['Account Code', me?.code],
    ['Level', me?.levelLabel],
    ['Currency', me?.currency],
    ['Last Login', fmtDateTime(me?.lastLoginAt)],
  ];

  const positions = [
    ['Credit Reference', me?.creditReference, false],
    ['Balance', me?.balance, false],
    ['Exposure', me?.exposure, false],
    ['Available Credit', me?.availableCredit, true],
    ['Settled P&L', me?.settledPl, true],
    ['Unsettled P&L', me?.unsettledPl, true],
  ];

  return (
    <div className="grid gap-6 animate-fade-up lg:grid-cols-2">
      <Card title="Account">
        <dl className="divide-y divide-hairline text-sm">
          {details.map(([term, value]) => (
            <div key={term} className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink-muted">{term}</dt>
              <dd className="text-ink">{value ?? '—'}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">Partnership</dt>
            <dd className="text-ink">{pct(me?.partnership)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">Commission</dt>
            <dd className="text-ink">{pct(me?.commissionRate)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">Downline</dt>
            <dd className="text-ink">
              {me?.downlineAgents ?? 0} agents · {me?.downlinePlayers ?? 0} players
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Position">
        <dl className="divide-y divide-hairline text-sm">
          {positions.map(([term, value, signed]) => (
            <div key={term} className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink-muted">{term}</dt>
              <dd className={`tabular-nums ${signed ? signClass(value) : 'text-ink'}`}>
                {money(value)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">Status</dt>
            <dd className="text-ink">
              {label(me?.status)}
              {me?.betLocked ? ' · betting locked' : ''}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Change Password" className="lg:col-span-2" id="password">
        {me?.mustChangePassword && (
          <p className="mb-5 rounded border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
            This account still uses the password your upline set. Change it
            before the audit trail means anything.
          </p>
        )}

        <form onSubmit={submit} className="max-w-xl space-y-5">
          {error && (
            <p className="rounded border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="current-password" className="field-label">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              required
              autoComplete="current-password"
              value={form.current}
              onChange={set('current')}
              className="field"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="field-label">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={form.next}
                onChange={set('next')}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="field-label">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={form.confirm}
                onChange={set('confirm')}
                className="field"
              />
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </Card>
    </div>
  );
}
