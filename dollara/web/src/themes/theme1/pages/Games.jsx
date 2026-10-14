'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { GameCard } from '@/components/GameCard';
import { api } from '@/services/api';

const CATEGORY_MAP = {
  lottery: 'lottery',
  'live-casino': 'live_casino',
  sports: 'sports',
  slots: 'slots',
  fantasy: 'fantasy',
  ai: 'ai_games',
};

export default function Theme1Games() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.category;
  const q = (searchParams.get('q') ?? '').trim();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    let url;
    if (slug === 'all') url = '/api/v1/games?limit=200';
    else if (slug === 'featured') url = '/api/v1/games?featured=true&limit=200';
    else url = `/api/v1/games?category=${CATEGORY_MAP[slug] ?? slug}&limit=200`;

    api(url)
      .then((data) => {
        if (active) setGames(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setGames([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  // Optional ?q= narrows the category to games matching a name/provider — used
  // by the specific sidebar items (Roulette, Blackjack, …).
  const filtered = useMemo(() => {
    if (!q) return games;
    const needle = q.toLowerCase();
    return games.filter(
      (g) =>
        g.name?.toLowerCase().includes(needle) ||
        g.provider_name?.toLowerCase().includes(needle),
    );
  }, [games, q]);

  const title =
    q ||
    (slug === 'all'
      ? 'All Games'
      : slug === 'featured'
        ? 'Trending'
        : slug?.replace(/-/g, ' ') ?? 'Games');

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold capitalize">{title}</h1>
      {loading ? (
        <p className="mt-8 text-center text-muted">Loading games…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted">No games found.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </main>
  );
}
