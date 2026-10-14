'use client';

// Recent big wins — real settled wins across all players (/api/v1/games/big-wins).
// Public and keyless; the API masks player names before they leave the server.

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { api } from '@/services/api';

const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

export function useBigWins(limit = 12, refreshMs = 45000) {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () =>
      api(`/api/v1/games/big-wins?limit=${limit}`)
        .then((data) => active && setWins(Array.isArray(data) ? data : []))
        .catch(() => active && setWins([]))
        .finally(() => active && setLoading(false));

    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [limit, refreshMs]);

  return { wins, loading };
}

export function BigWins({ limit = 8, title = 'Recent Big Wins' }) {
  const { wins, loading } = useBigWins(limit);

  // Nothing worth showing yet — stay out of the way rather than render an
  // empty shell on a fresh deployment.
  if (!loading && wins.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-brand-400" />
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-glass h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {wins.map((w) => (
            <WinCard key={w.id} win={w} />
          ))}
        </div>
      )}
    </section>
  );
}

function WinCard({ win }) {
  return (
    <article className="card-glass flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.04]">
        {win.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={win.thumbnail_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Trophy className="h-5 w-5 text-brand-400" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{win.username}</p>
        <p className="truncate text-xs text-slate-500">{win.game_name}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-emerald-400">{inr(win.win_amount)}</p>
        {win.multiplier && (
          <p className="text-[0.65rem] text-slate-500">{win.multiplier}×</p>
        )}
      </div>
    </article>
  );
}
