'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { api } from '@/services/api';

const CATEGORY_MAP = {
  lottery: 'lottery',
  'live-casino': 'live_casino',
  sports: 'sports',
  slots: 'slots',
  fantasy: 'fantasy',
  ai: 'ai_games',
};

function GameTile({ game }) {
  return (
    <Link href={`/play/${game.slug}`} className="group flex flex-col text-left">
      <span className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-amber-500/20 via-[#0d1420] to-[#070d16]">
        {game.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <span className="absolute inset-0 transition group-hover:bg-black/40" />
        <span className="relative grid h-12 w-12 scale-90 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-0 transition group-hover:scale-100 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-black text-black" />
        </span>
      </span>
      <span className="mt-2 truncate text-sm font-bold text-white">{game.name}</span>
      {game.provider_name && <span className="truncate text-xs text-slate-500">{game.provider_name}</span>}
    </Link>
  );
}

export default function Theme2Games() {
  const params = useParams();
  const category = CATEGORY_MAP[params.category] ?? params.category;
  const [games, setGames] = useState([]);

  useEffect(() => {
    api(`/api/v1/games?category=${category}`).then(setGames).catch(() => setGames([]));
  }, [category]);

  const title = params.category?.replace(/-/g, ' ') ?? 'Games';

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <h1 className="font-display text-2xl font-black capitalize text-white">{title}</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {games.map((game) => <GameTile key={game.id} game={game} />)}
      </div>
      {games.length === 0 && (
        <p className="mt-8 text-center text-slate-500">No games found. Start API and seed DB.</p>
      )}
    </div>
  );
}
