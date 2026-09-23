'use client';

// Theme5 Bet History — play/session records + aggregate P&L off the shared
// games API (/api/v1/games/history, /api/v1/games/pnl), rendered in the light
// portal style. Each row expands into its round-by-round detail
// (/api/v1/games/history/<uid>/rounds).
//
// A session the provider has not resolved yet reads "Pending", never a loss —
// sportsbook stakes are only a result once the official outcome arrives.

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, Loader2, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime } from '@/lib/datetime';
import { T5Card } from '../components/ui';

const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

export default function Theme5BetHistory() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [records, setRecords] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  // session_uid -> { loading, rounds, error }
  const [rounds, setRounds] = useState({});
  const [selectedRound, setSelectedRound] = useState(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    let active = true;
    Promise.all([
      api('/api/v1/games/history?limit=50').catch(() => ({ records: [] })),
      api('/api/v1/games/pnl').catch(() => null),
    ])
      .then(([hist, p]) => {
        if (!active) return;
        setRecords(Array.isArray(hist?.records) ? hist.records : []);
        setPnl(p);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, router]);

  const toggle = async (sessionUid) => {
    if (expanded === sessionUid) {
      setExpanded(null);
      return;
    }
    setExpanded(sessionUid);
    // Re-fetch if the last attempt failed, so a transient error is recoverable
    // by collapsing and re-opening the row.
    if (rounds[sessionUid] && !rounds[sessionUid].error) return;

    setRounds((r) => ({ ...r, [sessionUid]: { loading: true, rounds: [] } }));
    try {
      const data = await api(`/api/v1/games/history/${sessionUid}/rounds`);
      setRounds((r) => ({ ...r, [sessionUid]: { loading: false, rounds: data.rounds ?? [] } }));
    } catch (e) {
      setRounds((r) => ({
        ...r,
        [sessionUid]: { loading: false, rounds: [], error: e.message },
      }));
    }
  };

  if (!token) return null;

  return (
    <div className="mx-auto max-w-[1100px] px-3 py-4 sm:py-6">
      <div className="flex overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="theme5-tab py-2.5 pl-4">
          <h1 className="whitespace-nowrap text-sm font-black uppercase tracking-wide text-white sm:text-base">
            Bet History
          </h1>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--t5-muted)]">
        Your play sessions and results. Tap a row for round details.
      </p>

      {/* ---- P&L summary ---- */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="Total staked" value={pnl?.total_bet} />
        <Summary label="Total won" value={pnl?.total_win} />
        <Summary
          label="Net P&L"
          value={pnl?.profit_loss}
          tone={Number(pnl?.profit_loss ?? 0) >= 0 ? 'up' : 'down'}
        />
        <Summary
          label="Awaiting result"
          value={pnl?.pending_amount}
          tone="pending"
          hint={
            pnl?.pending_rounds
              ? `${pnl.pending_rounds} bet${pnl.pending_rounds === 1 ? '' : 's'} open`
              : null
          }
        />
      </section>

      {/* ---- Records ---- */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="font-display text-base font-black text-[var(--t5-ink)]">Sessions</h2>
        {!loading && records.length > 0 && (
          <span className="text-xs font-semibold text-[var(--t5-muted)]">
            {records.length} session{records.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <T5Card className="space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-black/[0.04]" />
          ))}
        </T5Card>
      ) : records.length === 0 ? (
        <T5Card className="px-4 py-12 text-center text-sm text-[var(--t5-muted)]">
          No bets yet.{' '}
          <Link href="/" className="font-bold text-[var(--t5-blue)] hover:underline">
            Explore games
          </Link>
        </T5Card>
      ) : (
        <T5Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#f7f9fc] text-left text-[0.65rem] uppercase tracking-wide text-[var(--t5-muted)]">
                  <th className="px-5 py-3 font-black">Game</th>
                  <th className="px-5 py-3 font-black">Category</th>
                  <th className="px-5 py-3 font-black">Date</th>
                  <th className="px-5 py-3 text-center font-black">Rounds</th>
                  <th className="px-5 py-3 text-right font-black">Staked</th>
                  <th className="px-5 py-3 text-right font-black">Won</th>
                  <th className="px-5 py-3 text-right font-black">Result</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const open = expanded === r.session_uid;
                  const detail = rounds[r.session_uid];
                  return (
                    <Fragment key={r.session_uid}>
                      <tr
                        onClick={() => toggle(r.session_uid)}
                        className="cursor-pointer border-b border-black/[0.05] transition last:border-0 hover:bg-[#f7f9fc]"
                      >
                        <td className="px-5 py-3 font-bold text-[var(--t5-ink)]">{r.game_name}</td>
                        <td className="px-5 py-3 capitalize text-[var(--t5-muted)]">
                          {(r.category || '—').replace(/_/g, ' ')}
                        </td>
                        <td className="px-5 py-3 text-[var(--t5-muted)]">
                          {formatDateTime(r.last_played_at || r.created_at)}
                        </td>
                        <td className="px-5 py-3 text-center text-[var(--t5-muted)]">
                          {r.rounds}
                          {r.pending_rounds > 0 && (
                            <span className="ml-1 text-[0.65rem] text-[#b45309]">
                              ({r.pending_rounds} open)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--t5-ink)]">
                          {inr(r.total_bet)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[var(--t5-ink)]">
                          {inr(r.total_win)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <ResultCell record={r} />
                        </td>
                        <td className="px-2 py-3 text-[var(--t5-muted)]">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                          />
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-black/[0.05]">
                          <td colSpan={8} className="bg-[#f7f9fc] px-5 py-4">
                            <RoundDetails detail={detail} onSelectRound={setSelectedRound} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </T5Card>
      )}

      {selectedRound && (
        <RoundDetailModal round={selectedRound} onClose={() => setSelectedRound(null)} />
      )}
    </div>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function ResultCell({ record }) {
  if (record.result === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#b45309]/10 px-2.5 py-0.5 text-xs font-black text-[#b45309]">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  const up = Number(record.profit_loss) >= 0;
  return (
    <span
      className={`font-black tabular-nums ${up ? 'text-[var(--t5-green)]' : 'text-[var(--t5-live)]'}`}
    >
      {up ? '+' : '−'}
      {inr(Math.abs(Number(record.profit_loss)))}
    </span>
  );
}

function RoundDetails({ detail, onSelectRound }) {
  if (!detail || detail.loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--t5-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rounds…
      </p>
    );
  }
  if (detail.error) {
    return <p className="text-sm font-semibold text-[var(--t5-live)]">{detail.error}</p>;
  }
  if (!detail.rounds.length) {
    return <p className="text-sm text-[var(--t5-muted)]">No round details recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wide text-[var(--t5-muted)]">
            <th className="py-2 pr-4 font-black">Round</th>
            <th className="py-2 pr-4 font-black">Game</th>
            <th className="py-2 pr-4 font-black">Category</th>
            <th className="py-2 pr-4 font-black">Placed</th>
            <th className="py-2 pr-4 font-black">Settled</th>
            <th className="py-2 pr-4 text-right font-black">Stake</th>
            <th className="py-2 pr-4 text-right font-black">Win</th>
            <th className="py-2 pr-4 text-right font-black">Wallet balance</th>
            <th className="py-2 text-right font-black">Result</th>
          </tr>
        </thead>
        <tbody className="text-[var(--t5-ink)]">
          {detail.rounds.map((rd) => (
            <tr
              key={rd.id}
              onClick={() => onSelectRound?.(rd)}
              className="cursor-pointer border-t border-black/[0.06] transition hover:bg-black/[0.03]"
            >
              <td className="py-2 pr-4 font-mono text-[0.7rem] text-[var(--t5-muted)]">
                {rd.game_round || rd.serial_number}
              </td>
              <td className="py-2 pr-4">{rd.game_name || '—'}</td>
              <td className="py-2 pr-4 capitalize text-[var(--t5-muted)]">
                {(rd.category || '—').replace(/_/g, ' ')}
              </td>
              <td className="py-2 pr-4 text-[var(--t5-muted)]">{formatDateTime(rd.created_at)}</td>
              <td className="py-2 pr-4 text-[var(--t5-muted)]">
                {rd.settled_at ? formatDateTime(rd.settled_at) : '—'}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{inr(rd.bet_amount)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{inr(rd.win_amount)}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-[var(--t5-muted)]">
                {rd.balance_after == null ? '—' : inr(rd.balance_after)}
              </td>
              <td className="py-2 text-right">
                {rd.result === 'pending' ? (
                  <span className="font-bold text-[#b45309]">Pending</span>
                ) : (
                  <span
                    className={`font-bold tabular-nums ${
                      rd.profit_loss >= 0 ? 'text-[var(--t5-green)]' : 'text-[var(--t5-live)]'
                    }`}
                  >
                    {rd.profit_loss >= 0 ? '+' : '−'}
                    {inr(Math.abs(rd.profit_loss))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoundDetailModal({ round, onClose }) {
  // Close on Escape and lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const isPending = round.result === 'pending';
  const up = Number(round.profit_loss) >= 0;

  const rows = [
    ['Round', round.game_round || round.serial_number || '—'],
    ['Game', round.game_name || '—'],
    ['Category', (round.category || '—').replace(/_/g, ' ')],
    ['Placed', formatDateTime(round.created_at)],
    ['Settled', round.settled_at ? formatDateTime(round.settled_at) : '—'],
    ['Stake', inr(round.bet_amount)],
    ['Win', inr(round.win_amount)],
    ['Balance before', round.balance_before == null ? '—' : inr(round.balance_before)],
    ['Balance after', round.balance_after == null ? '—' : inr(round.balance_after)],
    ['Status', isPending ? 'Pending' : (round.settle_status || round.result || '—')],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b-2 border-[#1d4ed8] bg-[#101c33] px-6 py-5">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="font-display text-lg font-black uppercase leading-none tracking-tight text-[#f5c518]">
            Round details
          </p>
          <p className="mt-1.5 font-mono text-[0.7rem] font-bold text-white/70">
            {round.game_round || round.serial_number}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-7">
          <dl className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <dt className="font-bold uppercase tracking-wide text-[0.65rem] text-[var(--t5-muted)]">
                  {label}
                </dt>
                <dd className="text-right font-semibold tabular-nums text-[var(--t5-ink)]">
                  {value}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t border-black/[0.06] pt-3 text-sm">
              <dt className="font-bold uppercase tracking-wide text-[0.65rem] text-[var(--t5-muted)]">
                Result
              </dt>
              <dd>
                {isPending ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#b45309]/10 px-2.5 py-0.5 text-xs font-black text-[#b45309]">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                ) : (
                  <span
                    className={`font-black tabular-nums ${
                      up ? 'text-[var(--t5-green)]' : 'text-[var(--t5-live)]'
                    }`}
                  >
                    {up ? '+' : '−'}
                    {inr(Math.abs(Number(round.profit_loss)))}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
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
