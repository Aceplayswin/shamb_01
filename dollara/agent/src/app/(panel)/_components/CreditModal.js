'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { agentWrite } from '../../../services/agentApi';
import { money } from '../../../lib/format';
import { toast } from '../../../lib/toast';

/**
 * Move credit to or from one downline account.
 *
 * One dialog for both directions rather than two: the fields, the validation
 * and the "what will my balance be afterwards" line are identical, and only
 * the sign of the movement differs.
 */
export default function CreditModal({ target, targetType, myBalance, onClose, onDone }) {
  const [direction, setDirection] = useState('down');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const numeric = Number(amount || 0);
  const projected =
    direction === 'down' ? Number(myBalance || 0) - numeric : Number(myBalance || 0) + numeric;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await agentWrite('/api/v1/agent/transfer', {
        counterpartyType: targetType,
        counterpartyId: target.id,
        direction,
        amount: numeric,
        remark: remark || undefined,
      });
      toast.success(
        `${money(numeric)} ${direction === 'down' ? 'credited to' : 'taken back from'} ${
          target.username
        }`,
      );
      onDone?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Transfer failed');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-modal-title"
    >
      <div className="w-full max-w-md rounded bg-panel shadow-menu">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 id="credit-modal-title" className="text-base font-semibold text-ink">
            Credit — {target.username}
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

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'down', label: 'Credit Down' },
              { value: 'up', label: 'Credit Up' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDirection(option.value)}
                aria-pressed={direction === option.value}
                className={`rounded px-4 py-2.5 text-sm font-medium transition ${
                  direction === option.value
                    ? 'bg-blue-600 text-white'
                    : 'border border-hairline text-ink-muted hover:bg-panel-hover'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="credit-amount" className="field-label">
              Amount
            </label>
            <input
              id="credit-amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="credit-remark" className="field-label">
              Remark
            </label>
            <input
              id="credit-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="field"
            />
          </div>

          <dl className="space-y-1 rounded bg-panel-sunken px-4 py-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Your balance now</dt>
              <dd className="tabular-nums text-ink">{money(myBalance)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">After this transfer</dt>
              <dd
                className={`tabular-nums ${projected < 0 ? 'text-down' : 'text-up'}`}
              >
                {money(projected)}
              </dd>
            </div>
          </dl>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy || numeric <= 0}
              className="btn-primary flex-1"
            >
              {busy ? 'Working…' : 'Confirm'}
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
