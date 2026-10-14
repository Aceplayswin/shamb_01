'use client';

// Theme5 Games (category listing) — shared games endpoint, light portal style:
// a navy angled section tab over a white card of game tiles.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const category = categoryFromSlug(params.category);
  // ?q= narrows a category to one table (the header rail's Roulette, Teen Patti
  // … shortcuts). The catalog matches it against name / slug / provider.
  const q = (searchParams.get('q') ?? '').trim();
  const [games, setGames] = useState([]);

  useEffect(() => {
    let active = true;
    // "all" is the uncategorised catalog: send no category so the API returns
    // every game rather than filtering on a category that does not exist.
    const url = `/api/v1/games?limit=200${
      category && category !== 'all' ? `&category=${category}` : ''
    }${q ? `&search=${encodeURIComponent(q)}` : ''}`;
    api(url)
      .then((data) => {
        if (active) setGames(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setGames([]);
      });
    return () => {
      active = false;
    };
  }, [category, q]);

  const title =
    q || (params.category === 'all' ? 'All Games' : params.category?.replace(/-/g, ' ')) || 'Games';

  return (
    <div>
      <T5SectionBar title={title} className="capitalize" />
      <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
        {/* Same tile footprint as the home page's rails (fixed ~120px squares),
            so opening "View All" keeps the alignment the player was just
            looking at instead of re-flowing every game to a different size. */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
          {games.map((game) => <GameTile key={game.id} game={game} />)}
        </div>
        {games.length === 0 && (
          <p className="py-8 text-center text-sm text-[#94a3b8]">
            {q ? `No ${q} tables available right now.` : 'No games found. Start API and seed DB.'}
          </p>
        )}
      </div>
    </div>
  );
}
