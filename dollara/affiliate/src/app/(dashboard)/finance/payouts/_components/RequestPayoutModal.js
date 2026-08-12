'use client';

import { useState } from 'react';
import { AlertCircle, X, Check, ArrowUpRight, CreditCard, Globe } from 'lucide-react';
import { affiliateApi } from '../../../../../services/affiliateApi';
import { inr } from '../../../../../lib/format';

const METHOD_ICONS = {
  bank: CreditCard,
  upi: ArrowUpRight,
  crypto: Globe,
};

export default function RequestPayoutModal({
  methods,
  balance,
  minimumThreshold,
  onClose,
  onRequested,
}) {
  const [amount, setAmount] = useState(balance);
  const [methodId, setMethodId] = useState(
    methods.find((m) => m.is_primary)?.id || methods[0]?.id,
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const selectedMethod = methods.find((m) => m.id === methodId);
  const canSubmit = amount >= minimumThreshold && amount > 0 && amount <= balance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await affiliateApi('/api/v1/affiliate/payouts/request', {
        method: 'POST',
        body: JSON.stringify({ amount, methodId }),
      });
      setDone(true);
      // Brief success state, then let the page refetch the new balance.
      setTimeout(() => onRequested?.(), 1400);
    } catch (err) {
      // The server enforces the threshold, the open-request rule and the
      // available balance; whichever one rejected says so here.
      setError(err.message || 'Could not submit your payout request.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-up">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100">
              Request a Payout
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Submit a withdrawal request for your available affiliate commission.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-8 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              Payout request submitted!
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Your request will be reviewed within 48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  Available
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                  {inr(balance)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  Minimum
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                  {inr(minimumThreshold)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  Selected method
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {selectedMethod?.label}
                </p>
              </div>
            </div>

            {/* amount + method */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  Amount
                </span>
                <input
                  type="number"
                  min="0"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  Payout method
                </span>
                <select
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                >
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label || method.method_type.toUpperCase()} — {method.masked_details}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* note */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 p-4 text-sm text-slate-500 dark:text-slate-400">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Request details
              </p>
              <p className="mt-2">
                Payout requests are reviewed by the finance team and processed after approval.
                Requests above your available balance will be rejected.
              </p>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${
                canSubmit
                  ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-black hover:shadow-md hover:brightness-105'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Submitting request...' : 'Submit payout request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}