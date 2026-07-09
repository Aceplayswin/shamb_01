'use client';

// Theme4 Games (category listing) — shared games endpoint, teal exchange style:
// a teal section bar header and dense square tiles like the home Top Games rail.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { api } from '@/services/api';
import { T4SectionBar } from '../components/ui';

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
      <span className="relative grid aspect-square place-items-center overflow-hidden rounded bg-gradient-to-br from-[#0a5560] to-[#101c1e] shadow-sm">
        {game.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <Play className="h-7 w-7 text-white/30" />
        )}
        <span className="absolute inset-0 transition group-hover:bg-black/30" />
        <span className="relative grid h-11 w-11 scale-90 place-items-center rounded-full bg-gradient-to-b from-[#17a2b0] to-[#0e7480] opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
      </span>
      <span className="mt-1.5 truncate text-xs font-bold text-[#13272b]">{game.name}</span>
      {game.provider_name && <span className="truncate text-[0.65rem] text-[#8aa0a4]">{game.provider_name}</span>}
    </Link>
  );
}

export default function Theme4Games() {
  const params = useParams();
  const category = CATEGORY_MAP[params.category] ?? params.category;
  const [games, setGames] = useState([]);

  useEffect(() => {
    api(`/api/v1/games?category=${category}`).then(setGames).catch(() => setGames([]));
  }, [category]);

  const title = params.category?.replace(/-/g, ' ') ?? 'Games';

  return (
    <div className="mx-auto max-w-[1200px] px-2 py-4 sm:px-3">
      <T4SectionBar className="capitalize">{title}</T4SectionBar>
      <div className="rounded-b border border-t-0 border-black/[0.07] bg-white p-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {games.map((game) => <GameTile key={game.id} game={game} />)}
        </div>
        {games.length === 0 && (
          <p className="py-8 text-center text-sm text-[#8aa0a4]">No games found. Start API and seed DB.</p>
        )}
      </div>
    </div>
  );
}
