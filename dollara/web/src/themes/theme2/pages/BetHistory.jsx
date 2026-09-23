'use client';

// Theme2 Bet History — dark-navy / gold. Play/session records + aggregate P&L
// off the shared games API (/api/v1/games/history, /api/v1/games/pnl). Each row
// expands into its round-by-round detail (/api/v1/games/history/<uid>/rounds).
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
import { T2Card } from '../components/ui';

const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

export default function Theme2BetHistory() {
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Bet History</h1>
      <p className="mt-1 text-sm text-slate-400">Your play sessions and results. Tap a row for round details.</p>

      {/* ---- P&L summary ---- */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          hint={pnl?.pending_rounds ? `${pnl.pending_rounds} bet${pnl.pending_rounds === 1 ? '' : 's'} open` : null}
        />
      </section>

      {/* ---- Records ---- */}
      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-white">Sessions</h2>
        {!loading && records.length > 0 && (
          <span className="text-xs font-semibold text-slate-500">
            {records.length} session{records.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <T2Card className="space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.03]" />
          ))}
        </T2Card>
      ) : records.length === 0 ? (
        <T2Card className="px-4 py-12 text-center text-sm text-slate-500">
          No bets yet.{' '}
          <Link href="/" className="font-bold text-amber-400 hover:underline">
            Explore games
          </Link>
        </T2Card>
      ) : (
        <T2Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-left text-[0.65rem] uppercase tracking-wide text-slate-500">
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
                        className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-3 font-bold text-white">{r.game_name}</td>
                        <td className="px-5 py-3 capitalize text-slate-400">{(r.category || '—').replace(/_/g, ' ')}</td>
                        <td className="px-5 py-3 text-slate-400">{formatDateTime(r.last_played_at || r.created_at)}</td>
                        <td className="px-5 py-3 text-center text-slate-400">
                          {r.rounds}
                          {r.pending_rounds > 0 && (
                            <span className="ml-1 text-[0.65rem] text-amber-400">({r.pending_rounds} open)</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-200">{inr(r.total_bet)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-200">{inr(r.total_win)}</td>
                        <td className="px-5 py-3 text-right">
                          <ResultCell record={r} />
                        </td>
                        <td className="px-2 py-3 text-slate-500">
                          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-white/5">
                          <td colSpan={8} className="bg-black/20 px-5 py-4">
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
        </T2Card>
      )}

      {selectedRound && <RoundDetailModal round={selectedRound} onClose={() => setSelectedRound(null)} />}
    </div>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function ResultCell({ record }) {
  if (record.result === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  const up = Number(record.profit_loss) >= 0;
  return (
    <span className={`font-black tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {up ? '+' : '−'}
      {inr(Math.abs(Number(record.profit_loss)))}
    </span>
  );
}

function RoundDetails({ detail, onSelectRound }) {
  if (!detail || detail.loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rounds…
      </p>
    );
  }
  if (detail.error) {
    return <p className="text-sm font-semibold text-rose-400">{detail.error}</p>;
  }
  if (!detail.rounds.length) {
    return <p className="text-sm text-slate-500">No round details recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wide text-slate-500">
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
        <tbody className="text-slate-300">
          {detail.rounds.map((rd) => (
            <tr
              key={rd.id}
              onClick={() => onSelectRound?.(rd)}
              className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03]"
            >
              <td className="py-2 pr-4 font-mono text-[0.7rem] text-slate-500">{rd.game_round || rd.serial_number}</td>
              <td className="py-2 pr-4">{rd.game_name || '—'}</td>
              <td className="py-2 pr-4 capitalize text-slate-500">{(rd.category || '—').replace(/_/g, ' ')}</td>
              <td className="py-2 pr-4 text-slate-500">{formatDateTime(rd.created_at)}</td>
              <td className="py-2 pr-4 text-slate-500">{rd.settled_at ? formatDateTime(rd.settled_at) : '—'}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{inr(rd.bet_amount)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{inr(rd.win_amount)}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-slate-500">
                {rd.balance_after == null ? '—' : inr(rd.balance_after)}
              </td>
              <td className="py-2 text-right">
                {rd.result === 'pending' ? (
                  <span className="font-bold text-amber-400">Pending</span>
                ) : (
                  <span className={`font-bold tabular-nums ${rd.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    ['Status', isPending ? 'Pending' : round.settle_status || round.result || '—'],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-[#0d1420] shadow-2xl">
        <div className="relative border-b border-white/5 bg-gradient-to-br from-amber-600/20 via-[#0d1420] to-[#070d16] px-6 py-5">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="font-display text-lg font-black uppercase leading-none tracking-tight text-amber-400">
            Round details
          </p>
          <p className="mt-1.5 font-mono text-[0.7rem] font-bold text-slate-400">
            {round.game_round || round.serial_number}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-7">
          <dl className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="text-right font-semibold tabular-nums text-white">{value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 text-sm">
              <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">Result</dt>
              <dd>
                {isPending ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-400">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                ) : (
                  <span className={`font-black tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : tone === 'pending' ? 'text-amber-400' : 'text-white';
  return (
    <T2Card className="p-4">
      <p className="text-[0.6rem] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-lg font-black tabular-nums ${color}`}>{inr(value)}</p>
      {hint && <p className="mt-0.5 text-[0.65rem] text-slate-500">{hint}</p>}
    </T2Card>
  );
}
