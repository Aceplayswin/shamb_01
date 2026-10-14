'use client';

// Theme5 Transactions — the player's money ledger off the shared wallet API
// (/api/v1/wallet/transactions): deposits, withdrawals, bonus credits, bet
// settlements, refunds and adjustments, newest first, in the light portal style.
//
// This is the money view; /bet-history is the play view. A transaction the
// cashier has not settled yet reads "Pending" and is excluded from the credited
// and debited totals — an unapproved withdrawal has not left the wallet.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime as formatDate } from '@/lib/datetime';
import { T5Card } from '../components/ui';
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

export default function Theme5Transactions() {
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
    <div className="mx-auto max-w-[1100px] px-3 py-4 sm:py-6">
      <div className="flex overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="theme5-tab py-2.5 pl-4">
          <h1 className="whitespace-nowrap text-sm font-black uppercase tracking-wide text-white sm:text-base">
            Transactions
          </h1>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--t5-muted)]">
        Money in and out of your wallet — deposits, withdrawals and bonuses. For
        your stakes and winnings, see{' '}
        <Link href="/bet-history" className="font-bold text-[var(--t5-blue)] hover:underline">
          bet history
        </Link>
        .
      </p>

      {/* ---- Totals ---- */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      <div className="mb-3 mt-6 flex flex-wrap items-center gap-2">
        {TX_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
              filter === f.value
                ? 'bg-[#101c33] text-white shadow-sm'
                : 'border border-black/10 bg-white text-[var(--t5-muted)] hover:border-[#1d4ed8] hover:text-[#1d4ed8]'
            }`}
          >
            {f.label}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-xs font-semibold text-[var(--t5-muted)]">
            {visible.length} transaction{visible.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* ---- Ledger ---- */}
      {loading ? (
        <T5Card className="space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-black/[0.04]" />
          ))}
        </T5Card>
      ) : error ? (
        <T5Card className="px-4 py-12 text-center text-sm font-semibold text-[var(--t5-live)]">
          {error}
        </T5Card>
      ) : visible.length === 0 ? (
        <T5Card className="px-4 py-12 text-center text-sm text-[var(--t5-muted)]">
          {txs.length === 0 ? (
            <>
              No transactions yet.{' '}
              <Link href="/deposit" className="font-bold text-[var(--t5-blue)] hover:underline">
                Make a deposit
              </Link>
            </>
          ) : (
            'No transactions of this type.'
          )}
        </T5Card>
      ) : (
        <T5Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#f7f9fc] text-left text-[0.65rem] uppercase tracking-wide text-[var(--t5-muted)]">
                  <th className="px-5 py-3 font-black">Type</th>
                  <th className="px-5 py-3 font-black">Date</th>
                  <th className="px-5 py-3 font-black">Method</th>
                  <th className="px-5 py-3 font-black">Reference</th>
                  <th className="px-5 py-3 font-black">Status</th>
                  <th className="px-5 py-3 text-right font-black">Amount</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-black/[0.05] transition last:border-0 hover:bg-[#f7f9fc]"
                  >
                    <td className="px-5 py-3 font-bold text-[var(--t5-ink)]">
                      {TX_LABELS[t.type] ?? t.type}
                    </td>
                    <td className="px-5 py-3 text-[var(--t5-muted)]">{formatDate(t.created_at)}</td>
                    <td className="px-5 py-3 text-[var(--t5-muted)]">{t.payment_method || '—'}</td>
                    <td className="px-5 py-3 font-mono text-[0.7rem] text-[var(--t5-muted)]">
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
        </T5Card>
      )}
    </div>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function AmountCell({ tx }) {
  const credit = CREDIT_TYPES.has(tx.type);
  // Only a settled transaction has actually moved money, so a pending row is
  // shown neutral rather than coloured as a gain or a loss.
  const tone = !isSettled(tx.status)
    ? 'text-[var(--t5-muted)]'
    : credit
      ? 'text-[var(--t5-green)]'
      : 'text-[var(--t5-live)]';
  return (
    <span className={`font-black tabular-nums ${tone}`}>
      {credit ? '+' : '−'}
      {inr(Math.abs(Number(tx.amount ?? 0)))}
    </span>
  );
}

function StatusPill({ status }) {
  const tone = statusTone(status);
  const cls =
    tone === 'good'
      ? 'bg-[var(--t5-green)]/10 text-[var(--t5-green)]'
      : tone === 'bad'
        ? 'bg-[var(--t5-live)]/10 text-[var(--t5-live)]'
        : 'bg-[#b45309]/10 text-[#b45309]';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

function Summary({ label, value, tone, hint }) {
  const color =
    tone === 'up'
      ? 'text-[var(--t5-green)]'
      : tone === 'down'
        ? 'text-[var(--t5-live)]'
        : tone === 'pending'
          ? 'text-[#b45309]'
          : 'text-[var(--t5-ink)]';
  return (
    <T5Card className="p-4">
      <p className="text-[0.6rem] font-black uppercase tracking-wide text-[var(--t5-muted)]">
        {label}
      </p>
      <p className={`mt-1 font-display text-lg font-black tabular-nums ${color}`}>{inr(value)}</p>
      {hint && <p className="mt-0.5 text-[0.65rem] text-[var(--t5-muted)]">{hint}</p>}
    </T5Card>
  );
}
