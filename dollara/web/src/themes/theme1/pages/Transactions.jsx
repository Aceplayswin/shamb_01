'use client';

// Transactions — the player's money ledger off the shared wallet API
// (/api/v1/wallet/transactions): deposits, withdrawals, bonus credits, bet
// settlements, refunds and adjustments, newest first, in theme1's dark-glass
// style (same conventions as BetHistory.jsx: card-glass panels, Summary tiles,
// the same table shell).
//
// This is the money view; /bet-history is the play view. A transaction the
// cashier has not settled yet reads "Pending" and is excluded from the
// credited/debited totals — an unapproved withdrawal has not left the wallet.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime } from '@/lib/datetime';
import {
  CREDIT_TYPES,
  TX_FILTERS,
  TX_LABELS,
  cashierOnly,
  isSettled,
  statusTone,
  summarise,
} from '@/lib/transactions';

const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

export default function Theme1Transactions() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    let active = true;
    api('/api/v1/wallet/transactions')
      .then((data) => {
        if (!active) return;
        // Cashier rows only — per-round settlements are read on /bet-history,
        // where each row carries the stake, win and balance that explain it.
        setTxs(cashierOnly(Array.isArray(data) ? data : []));
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, router]);

  const totals = useMemo(() => summarise(txs), [txs]);
  const visible = useMemo(
    () => (filter === 'all' ? txs : txs.filter((t) => t.type === filter)),
    [txs, filter],
  );

  if (!token) return null;

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <p className="mt-1 text-sm text-slate-400">
        Money in and out of your wallet — deposits, withdrawals and bonuses. For
        your stakes and winnings, see{' '}
        <Link href="/bet-history" className="text-brand-400 hover:underline">
          bet history
        </Link>
        .
      </p>

      {/* ---- Totals ---- */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Total credited" value={totals.credited} tone="up" />
        <Summary label="Total debited" value={totals.debited} tone="down" />
        <Summary
          label="Pending"
          value={totals.pending}
          tone="pending"
          hint={
            totals.pendingCount
              ? `${totals.pendingCount} awaiting approval`
              : 'Nothing awaiting approval'
          }
        />
        <Summary label="Net movement" value={totals.net} tone={totals.net >= 0 ? 'up' : 'down'} />
      </section>

      {/* ---- Filters ---- */}
      <div className="mb-4 mt-8 flex flex-wrap items-center gap-2">
        {TX_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              filter === f.value
                ? 'bg-brand-500 text-surface-900'
                : 'bg-surface-700 text-slate-400 hover:bg-brand-500/20 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-xs text-slate-500">
            {visible.length} transaction{visible.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* ---- Ledger ---- */}
      {loading ? (
        <div className="card-glass space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.03]" />
          ))}
        </div>
      ) : error ? (
        <div className="card-glass px-4 py-12 text-center text-sm text-red-400">{error}</div>
      ) : visible.length === 0 ? (
        <div className="card-glass px-4 py-12 text-center text-sm text-slate-500">
          {txs.length === 0 ? (
            <>
              No transactions yet.{' '}
              <Link href="/deposit" className="text-brand-400 hover:underline">
                Make a deposit
              </Link>
            </>
          ) : (
            'No transactions of this type.'
          )}
        </div>
      ) : (
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3 font-medium text-white">
                      {TX_LABELS[t.type] ?? t.type}
                    </td>
                    <td className="px-5 py-3 text-slate-400">{formatDateTime(t.created_at)}</td>
                    <td className="px-5 py-3 text-slate-400">{t.payment_method || '—'}</td>
                    <td className="px-5 py-3 font-mono text-[0.7rem] text-slate-500">
                      {t.reference_number || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <AmountCell tx={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function AmountCell({ tx }) {
  const credit = CREDIT_TYPES.has(tx.type);
  // Only a settled transaction has actually moved money, so a pending row is
  // shown neutral rather than coloured as a gain or a loss.
  const tone = !isSettled(tx.status) ? 'text-slate-500' : credit ? 'text-green-400' : 'text-red-400';
  return (
    <span className={`font-semibold ${tone}`}>
      {credit ? '+' : '−'}
      {inr(Math.abs(Number(tx.amount ?? 0)))}
    </span>
  );
}

function StatusPill({ status }) {
  const tone = statusTone(status);
  const cls =
    tone === 'good'
      ? 'bg-green-500/15 text-green-400'
      : tone === 'bad'
        ? 'bg-red-500/15 text-red-400'
        : 'bg-amber-500/15 text-amber-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

function Summary({ label, value, tone, hint }) {
  const color =
    tone === 'up'
      ? 'text-green-400'
      : tone === 'down'
        ? 'text-red-400'
        : tone === 'pending'
          ? 'text-amber-400'
          : 'text-white';
  return (
    <div className="card-glass p-4">
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{inr(value)}</p>
      {hint && <p className="mt-0.5 text-[0.65rem] text-slate-500">{hint}</p>}
    </div>
  );
}
