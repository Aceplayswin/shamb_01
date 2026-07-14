'use client';

// Bet history — play/session records + aggregate P&L off the shared games API
// (/api/v1/games/history, /api/v1/games/pnl). Registered under theme1; the other
// themes fall back to this page (same pattern as settings).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

export default function Theme1BetHistory() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [records, setRecords] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (!token) return null;

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Bet History</h1>
      <p className="mt-1 text-sm text-slate-400">Your recent play sessions and results.</p>

      {/* ---- P&L summary ---- */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Total staked" value={pnl?.total_bet} />
        <Summary label="Total won" value={pnl?.total_win} />
        <Summary
          label="Net P&L"
          value={pnl?.profit_loss}
          tone={Number(pnl?.profit_loss ?? 0) >= 0 ? 'up' : 'down'}
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
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Game</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 text-center font-medium">Rounds</th>
                    <th className="px-5 py-3 text-right font-medium">Staked</th>
                    <th className="px-5 py-3 text-right font-medium">Won</th>
                    <th className="px-5 py-3 text-right font-medium">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const up = Number(r.profit_loss) >= 0;
                    return (
                      <tr
                        key={r.session_uid}
                        className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-3 font-medium text-white">{r.game_name}</td>
                        <td className="px-5 py-3 text-slate-400">
                          {formatDate(r.last_played_at || r.created_at)}
                        </td>
                        <td className="px-5 py-3 text-center text-slate-400">{r.rounds}</td>
                        <td className="px-5 py-3 text-right text-slate-300">
                          ₹{Number(r.total_bet).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-300">
                          ₹{Number(r.total_win).toLocaleString('en-IN')}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-semibold ${
                            up ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {up ? '+' : '−'}₹{Math.abs(Number(r.profit_loss)).toLocaleString('en-IN')}
                        </td>
                      </tr>
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

function Summary({ label, value, tone }) {
  const color =
    tone === 'up' ? 'text-green-400' : tone === 'down' ? 'text-red-400' : 'text-white';
  return (
    <div className="card-glass p-4">
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}
