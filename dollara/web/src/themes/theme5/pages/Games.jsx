'use client';

// Theme5 Games (category listing) — shared games endpoint, light portal style:
// a navy angled section tab over a white card of game tiles.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { api } from '@/services/api';
import { categoryFromSlug } from '@/lib/gameRoutes';
import { T5SectionBar } from '../components/ui';

function GameTile({ game }) {
  return (
    <Link href={`/play/${game.slug}`} className="group flex flex-col text-left">
      <span className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-[#101c33] shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        {game.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Play className="h-7 w-7 text-white/30" />
        )}
        <span className="absolute inset-0 transition group-hover:bg-black/35" />
        <span className="relative grid h-11 w-11 scale-90 place-items-center rounded-full bg-[#1d4ed8] opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
      </span>
      <span className="mt-1.5 truncate text-xs font-black text-[#0f1b33]">{game.name}</span>
      {game.provider_name && (
        <span className="truncate text-[0.65rem] text-[#94a3b8]">{game.provider_name}</span>
      )}
    </Link>
  );
}

export default function Theme5Games() {
  const params = useParams();
  const category = categoryFromSlug(params.category);
  const [games, setGames] = useState([]);

  useEffect(() => {
    api(`/api/v1/games?category=${category}`).then(setGames).catch(() => setGames([]));
  }, [category]);

  const title = params.category?.replace(/-/g, ' ') ?? 'Games';

  return (
    <div>
      <T5SectionBar title={title} className="capitalize" />
      <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {games.map((game) => <GameTile key={game.id} game={game} />)}
        </div>
        {games.length === 0 && (
          <p className="py-8 text-center text-sm text-[#94a3b8]">No games found. Start API and seed DB.</p>
        )}
      </div>
    </div>
  );
}
