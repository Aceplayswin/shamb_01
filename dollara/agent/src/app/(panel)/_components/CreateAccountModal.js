'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { agentWrite } from '../../../services/agentApi';
import { label } from '../../../lib/format';
import { toast } from '../../../lib/toast';

/**
 * Open a downline account.
 *
 * One dialog for both kinds: a client (an agent account, which needs a level
 * and a partnership split) and a player (which needs neither). `kind` decides
 * which fields appear and which endpoint receives them — the rest of the form,
 * and all of its validation, is shared.
 */
export default function CreateAccountModal({ kind, levels = [], onClose, onDone }) {
  const isClient = kind === 'client';
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    phone: '',
    level: levels[0] ?? '',
    partnership: '',
    commissionRate: '',
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
      if (isClient) {
        await agentWrite('/api/v1/agent/clients/create', {
          username: form.username.trim(),
          password: form.password,
          name: form.name.trim() || form.username.trim(),
          level: form.level,
          partnership: Number(form.partnership || 0),
          commissionRate: Number(form.commissionRate || 0),
          credit: Number(form.credit || 0),
        });
      } else {
        await agentWrite('/api/v1/agent/players/create', {
          username: form.username.trim(),
          password: form.password,
          fullName: form.name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          credit: Number(form.credit || 0),
        });
      }
      toast.success(`${form.username} created`);
      onDone?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Could not create the account');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
    >
      <div className="my-8 w-full max-w-lg rounded bg-panel shadow-menu">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 id="create-modal-title" className="text-base font-semibold text-ink">
            {isClient ? 'Create Client Account' : 'Create Player Account'}
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

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="create-username" className="field-label">
                Username
              </label>
              <input
                id="create-username"
                required
                minLength={4}
                maxLength={30}
                value={form.username}
                onChange={set('username')}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="create-password" className="field-label">
                Password
              </label>
              <input
                id="create-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="create-name" className="field-label">
                {isClient ? 'Account Name' : 'Full Name'}
              </label>
              <input
                id="create-name"
                value={form.name}
                onChange={set('name')}
                className="field"
              />
            </div>

            {isClient ? (
              <div>
                <label htmlFor="create-level" className="field-label">
                  Level
                </label>
                <select
                  id="create-level"
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
            ) : (
              <div>
                <label htmlFor="create-phone" className="field-label">
                  Phone
                </label>
                <input
                  id="create-phone"
                  value={form.phone}
                  onChange={set('phone')}
                  className="field"
                />
              </div>
            )}

            {isClient && (
              <>
                <div>
                  <label htmlFor="create-partnership" className="field-label">
                    Partnership %
                  </label>
                  <input
                    id="create-partnership"
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
                  <label htmlFor="create-commission" className="field-label">
                    Commission %
                  </label>
                  <input
                    id="create-commission"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.commissionRate}
                    onChange={set('commissionRate')}
                    className="field"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="create-credit" className="field-label">
                Opening Credit
              </label>
              <input
                id="create-credit"
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
            Opening credit comes out of your own available credit, and is
            recorded on your transfer statement.
          </p>

          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Creating…' : 'Create Account'}
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
