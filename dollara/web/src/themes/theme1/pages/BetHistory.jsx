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

      {/* ---- Records ---- */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Sessions</h2>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card-glass h-20 animate-pulse opacity-60" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {records.map((r) => (
              <li key={r.session_uid} className="card-glass px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{r.game_name}</p>
                    <p className="text-xs text-slate-500">
                      {r.rounds} {r.rounds === 1 ? 'round' : 'rounds'} · {formatDate(r.last_played_at || r.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      Number(r.profit_loss) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {Number(r.profit_loss) >= 0 ? '+' : '−'}₹
                    {Math.abs(Number(r.profit_loss)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-slate-500">
                  <span>Staked ₹{Number(r.total_bet).toLocaleString('en-IN')}</span>
                  <span>Won ₹{Number(r.total_win).toLocaleString('en-IN')}</span>
                </div>
              </li>
            ))}
            {records.length === 0 && (
              <li className="card-glass px-4 py-10 text-center text-sm text-slate-500 md:col-span-2">
                No bets yet.{' '}
                <Link href="/" className="text-brand-400 hover:underline">
                  Explore games
                </Link>
              </li>
            )}
          </ul>
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
