'use client';

// Theme4 Providers — the full game-provider directory behind the home page's
// Top Games rail. Teal exchange style, dense square tiles (mirrors Games.jsx):
//   • no ?provider=  → every provider the catalog carries, as tiles + counts
//   • ?provider=Name → that provider's games, with a way back to the directory
// Provider names/counts are derived straight from the shared game catalog (no
// separate provider-logo endpoint exists in this build), so the directory
// always matches what the product actually offers.

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { T4SectionBar } from '../components/ui';

// Above the whole catalog, so every provider and every game is represented.
const CATALOG_LIMIT = 2000;

function providerHref(name) {
  return `/providers?provider=${encodeURIComponent(name)}`;
}

function ProviderTile({ name, count }) {
  return (
    <Link href={providerHref(name)} className="group flex flex-col items-center gap-1.5">
      <span className="grid aspect-square w-full place-items-center overflow-hidden rounded bg-gradient-to-br from-[#0a5560] to-[#101c1e] p-3 text-center shadow-sm transition group-hover:brightness-110">
        <span className="line-clamp-2 font-display text-xs font-black uppercase leading-tight tracking-wide text-white sm:text-sm">
          {name}
        </span>
      </span>
      <span className="text-[0.65rem] font-bold text-[#8aa0a4]">
        {count} {count === 1 ? 'game' : 'games'}
      </span>
    </Link>
  );
}

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

export default function Theme4Providers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = (searchParams.get('provider') ?? '').trim();
  // One catalog read serves both states: the directory counts games per
  // provider and the detail view filters the same list. The limit sits above
  // the full catalog size so no provider is undercounted or dropped.
  const { games, loading } = useGameCatalog({ limit: CATALOG_LIMIT });

  const providers = useMemo(() => {
    const counts = new Map();
    for (const g of games) {
      if (!g.provider_name) continue;
      counts.set(g.provider_name, (counts.get(g.provider_name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [games]);

  const providerGames = useMemo(
    () => (selected ? games.filter((g) => g.provider_name === selected) : []),
    [games, selected],
  );

  if (selected) {
    return (
      <div className="mx-auto max-w-[1200px] px-2 py-4 sm:px-3">
        <T4SectionBar>{selected}</T4SectionBar>
        <div className="rounded-b border border-t-0 border-black/[0.07] bg-white p-3">
          <button
            type="button"
            onClick={() => router.push('/providers')}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#0e7480]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to providers
          </button>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {providerGames.map((game) => <GameTile key={game.id} game={game} />)}
          </div>
          {!loading && providerGames.length === 0 && (
            <p className="py-8 text-center text-sm text-[#8aa0a4]">
              No games available from {selected} right now.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-2 py-4 sm:px-3">
      <T4SectionBar>Game Providers</T4SectionBar>
      <div className="rounded-b border border-t-0 border-black/[0.07] bg-white p-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {providers.map(({ name, count }) => (
            <ProviderTile key={name} name={name} count={count} />
          ))}
        </div>
        {!loading && providers.length === 0 && (
          <p className="py-8 text-center text-sm text-[#8aa0a4]">
            No providers available right now.
          </p>
        )}
      </div>
    </div>
  );
}
