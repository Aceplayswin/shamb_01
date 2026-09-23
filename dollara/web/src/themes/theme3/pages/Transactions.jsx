'use client';

// Theme3 Transactions — the player's money ledger off the shared wallet API
// (/api/v1/wallet/transactions): deposits, withdrawals, bonus credits, bet
// settlements, refunds and adjustments, newest first, in VELPLAY's cream/gold
// style.
//
// This is the money view; /bet-history is the play view. A transaction the
// cashier has not settled yet reads "Pending" and is excluded from the
// credited and debited totals — an unapproved withdrawal has not left the
// wallet.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime as formatDate } from '@/lib/datetime';
import { T3Card } from '../components/ui';
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

export default function Theme3Transactions() {
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
        // Cashier rows only — per-round settlements are read on /bet-history.
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
    <div className="mx-auto max-w-[1200px] px-3 py-4 sm:px-5 sm:py-8">
      <h1 className="font-display text-2xl font-black text-[#1b1726] sm:text-3xl">Transactions</h1>
      <p className="mt-1 text-sm text-[#6b6579]">
        Money in and out of your wallet — deposits, withdrawals and bonuses. For your stakes and
        winnings, see{' '}
        <Link href="/bet-history" className="font-bold text-[#9a7a24] hover:underline">
          bet history
        </Link>
        .
      </p>

      {/* ---- Totals ---- */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="Total credited" value={totals.credited} tone="up" />
        <Summary label="Total debited" value={totals.debited} tone="down" />
        <Summary
          label="Pending"
          value={totals.pending}
          tone="pending"
          hint={totals.pendingCount ? `${totals.pendingCount} awaiting approval` : 'Nothing awaiting approval'}
        />
        <Summary label="Net movement" value={totals.net} tone={totals.net >= 0 ? 'up' : 'down'} />
      </section>

      {/* ---- Filters ---- */}
      <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
        {TX_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
              filter === f.value
                ? 'bg-gradient-to-br from-[#e9c56b] via-[#c79a3b] to-[#b8862f] text-[#241b0e] shadow-sm'
                : 'border border-black/10 bg-white text-[#6b6579] hover:border-[#c79a3b]/50 hover:text-[#9a7a24]'
            }`}
          >
            {f.label}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-xs font-semibold text-[#9a94a8]">
            {visible.length} transaction{visible.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* ---- Ledger ---- */}
      {loading ? (
        <T3Card className="space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-black/[0.04]" />
          ))}
        </T3Card>
      ) : error ? (
        <T3Card className="px-4 py-12 text-center text-sm font-semibold text-[#c23a3e]">{error}</T3Card>
      ) : visible.length === 0 ? (
        <T3Card className="px-4 py-12 text-center text-sm text-[#9a94a8]">
          {txs.length === 0 ? (
            <>
              No transactions yet.{' '}
              <Link href="/deposit" className="font-bold text-[#9a7a24] hover:underline">
                Make a deposit
              </Link>
            </>
          ) : (
            'No transactions of this type.'
          )}
        </T3Card>
      ) : (
        <T3Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#faf6ec] text-left text-[0.65rem] uppercase tracking-wide text-[#9a94a8]">
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
                  <tr key={t.id} className="border-b border-black/[0.05] transition last:border-0 hover:bg-[#faf6ec]/60">
                    <td className="px-5 py-3 font-black text-[#1b1726]">{TX_LABELS[t.type] ?? t.type}</td>
                    <td className="px-5 py-3 text-[#6b6579]">{formatDate(t.created_at)}</td>
                    <td className="px-5 py-3 text-[#6b6579]">{t.payment_method || '—'}</td>
                    <td className="px-5 py-3 font-mono text-[0.7rem] text-[#6b6579]">{t.reference_number || '—'}</td>
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
        </T3Card>
      )}
    </div>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function AmountCell({ tx }) {
  const credit = CREDIT_TYPES.has(tx.type);
  const tone = !isSettled(tx.status) ? 'text-[#9a94a8]' : credit ? 'text-[#1c8a52]' : 'text-[#c23a3e]';
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
      ? 'bg-[#2fbf71]/10 text-[#1c8a52]'
      : tone === 'bad'
        ? 'bg-[#e5484d]/10 text-[#c23a3e]'
        : 'bg-[#f3ead4] text-[#9a7a24]';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black capitalize ${cls}`}>
      {status}
    </span>
  );
}

function Summary({ label, value, tone, hint }) {
  const color =
    tone === 'up' ? 'text-[#1c8a52]' : tone === 'down' ? 'text-[#c23a3e]' : tone === 'pending' ? 'text-[#9a7a24]' : 'text-[#1b1726]';
  return (
    <T3Card className="p-4">
      <p className="text-[0.6rem] font-black uppercase tracking-wide text-[#9a94a8]">{label}</p>
      <p className={`mt-1 font-display text-lg font-black tabular-nums ${color}`}>{inr(value)}</p>
      {hint && <p className="mt-0.5 text-[0.65rem] text-[#9a94a8]">{hint}</p>}
    </T3Card>
  );
}
