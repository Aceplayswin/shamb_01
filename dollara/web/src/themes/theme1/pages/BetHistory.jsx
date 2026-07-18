'use client';

// Bet history — play/session records + aggregate P&L off the shared games API
// (/api/v1/games/history, /api/v1/games/pnl). Each row expands into its
// round-by-round detail (/api/v1/games/history/<uid>/rounds).
//
// A session the provider has not resolved yet reads "Pending", never a loss —
// sportsbook stakes are only a result once the official outcome arrives.
// Registered under theme1; the other themes fall back to this page.

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

export default function Theme1BetHistory() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [records, setRecords] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  // session_uid -> { loading, rounds, error }
  const [rounds, setRounds] = useState({});

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
      setRounds((r) => ({
        ...r,
        [sessionUid]: { loading: false, rounds: data.rounds ?? [] },
      }));
    } catch (e) {
      setRounds((r) => ({
        ...r,
        [sessionUid]: { loading: false, rounds: [], error: e.message },
      }));
    }
  };

  if (!token) return null;

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Bet History</h1>
      <p className="mt-1 text-sm text-slate-400">
        Your play sessions and results. Tap a row for round details.
      </p>

      {/* ---- P&L summary ---- */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* ---- Records table ---- */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sessions</h2>
          {!loading && records.length > 0 && (
            <span className="text-xs text-slate-500">{records.length} sessions</span>
          )}
        </div>

        {loading ? (
          <div className="card-glass space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="card-glass px-4 py-12 text-center text-sm text-slate-500">
            No bets yet.{' '}
            <Link href="/" className="text-brand-400 hover:underline">
              Explore games
            </Link>
          </div>
        ) : (
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Game</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 text-center font-medium">Rounds</th>
                    <th className="px-5 py-3 text-right font-medium">Staked</th>
                    <th className="px-5 py-3 text-right font-medium">Won</th>
                    <th className="px-5 py-3 text-right font-medium">Result</th>
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
                          <td className="px-5 py-3 font-medium text-white">
                            {r.game_name}
                          </td>
                          <td className="px-5 py-3 text-slate-400">
                            {formatDate(r.last_played_at || r.created_at)}
                          </td>
                          <td className="px-5 py-3 text-center text-slate-400">
                            {r.rounds}
                            {r.pending_rounds > 0 && (
                              <span className="ml-1 text-[0.65rem] text-amber-400">
                                ({r.pending_rounds} open)
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-300">
                            {inr(r.total_bet)}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-300">
                            {inr(r.total_win)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <ResultCell record={r} />
                          </td>
                          <td className="px-2 py-3 text-slate-500">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                open ? 'rotate-180' : ''
                              }`}
                            />
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-white/5">
                            <td colSpan={7} className="bg-black/20 px-5 py-4">
                              <RoundDetails detail={detail} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function ResultCell({ record }) {
  if (record.result === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  const up = Number(record.profit_loss) >= 0;
  return (
    <span className={`font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
      {up ? '+' : '−'}
      {inr(Math.abs(Number(record.profit_loss)))}
    </span>
  );
}

function RoundDetails({ detail }) {
  if (!detail || detail.loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rounds…
      </p>
    );
  }
  if (detail.error) {
    return <p className="text-sm text-red-400">{detail.error}</p>;
  }
  if (!detail.rounds.length) {
    return <p className="text-sm text-slate-500">No round details recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4 font-medium">Round</th>
            <th className="py-2 pr-4 font-medium">Game</th>
            <th className="py-2 pr-4 font-medium">Time</th>
            <th className="py-2 pr-4 text-right font-medium">Stake</th>
            <th className="py-2 pr-4 text-right font-medium">Win</th>
            <th className="py-2 pr-4 text-right font-medium">Balance</th>
            <th className="py-2 text-right font-medium">Result</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {detail.rounds.map((rd) => (
            <tr key={rd.id} className="border-t border-white/5">
              <td className="py-2 pr-4 font-mono text-[0.7rem] text-slate-400">
                {rd.game_round || rd.serial_number}
              </td>
              <td className="py-2 pr-4">{rd.game_name || '—'}</td>
              <td className="py-2 pr-4 text-slate-400">{formatTime(rd.created_at)}</td>
              <td className="py-2 pr-4 text-right">{inr(rd.bet_amount)}</td>
              <td className="py-2 pr-4 text-right">{inr(rd.win_amount)}</td>
              <td className="py-2 pr-4 text-right text-slate-400">
                {rd.balance_after == null ? '—' : inr(rd.balance_after)}
              </td>
              <td className="py-2 text-right">
                {rd.result === 'pending' ? (
                  <span className="text-amber-400">Pending</span>
                ) : (
                  <span className={rd.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}>
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

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
