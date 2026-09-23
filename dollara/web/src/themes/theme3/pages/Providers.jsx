'use client';

// Theme3 Providers — the full game-provider directory behind the home page's
// "Game Providers ▸ View All" banner. Two states in one page:
//   • no ?provider=  → every provider the catalog carries, as tiles
//   • ?provider=Name → that provider's games, with a way back to the directory
// Provider names come from the shared catalog rather than a hardcoded logo
// list, so the directory always matches what the product actually offers.
// Styling matches Home's "Game Providers" banner + Games.jsx's tile grid.

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { filterByProvider, playPath } from '@/lib/gameRoutes';

// Above the whole catalog, so every provider and every game is represented.
const CATALOG_LIMIT = 2000;

function providerHref(name) {
  return `/providers?provider=${encodeURIComponent(name)}`;
}

function ProviderTile({ name, count }) {
  return (
    <Link
      href={providerHref(name)}
      title={name}
      className="group grid aspect-square place-items-center rounded-2xl border border-[#c79a3b]/15 bg-gradient-to-br from-white to-[#faf6ec] p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#c79a3b]/50 hover:shadow-md"
    >
      <span className="line-clamp-2 text-xs font-black uppercase leading-tight tracking-wide text-[#4a4458] group-hover:text-[#9a7a24]">
        {name}
      </span>
      <span className="mt-1 block text-[0.6rem] font-bold text-[#9a94a8]">
        {count} {count === 1 ? 'game' : 'games'}
      </span>
    </Link>
  );
}

function GameTile({ game }) {
  return (
    <Link href={playPath(game)} className="group flex flex-col text-left">
      <span className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-br from-[#efe9f6] to-[#e2dcf0] shadow-sm">
        {game.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <Play className="h-7 w-7 text-[#b6aecb]" />
        )}
        <span className="absolute inset-0 transition group-hover:bg-black/25" />
        <span className="relative grid h-12 w-12 scale-90 place-items-center rounded-full bg-gradient-to-br from-[#e9c56b] to-[#b8862f] opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-[#241b0e] text-[#241b0e]" />
        </span>
      </span>
      <span className="mt-2 truncate text-sm font-black text-[#1b1726]">{game.name}</span>
      {game.provider_name && <span className="truncate text-xs text-[#9a94a8]">{game.provider_name}</span>}
    </Link>
  );
}

function PageBanner({ title, count, countLabel }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#2a2140] to-[#171029] px-5 py-4 text-white shadow-sm">
      <div>
        <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#e9c56b]/80">Studio Network</p>
        <p className="font-display text-xl font-black">{title}</p>
      </div>
      {count != null && (
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-black text-white/70">
          {count} {countLabel}
        </span>
      )}
    </div>
  );
}

export default function Theme3Providers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = (searchParams.get('provider') ?? '').trim();
  // One catalog read serves both states: the directory counts games per
  // provider and the detail view filters the same list, so switching between
  // them is free. The limit is deliberately above the full catalog size.
  const { games, loading } = useGameCatalog({ limit: CATALOG_LIMIT });

  const providers = useMemo(() => {
    const counts = new Map();
    games.forEach((g) => {
      if (g.provider_name) counts.set(g.provider_name, (counts.get(g.provider_name) ?? 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }, [games]);

  const providerGames = useMemo(
    () => (selected ? filterByProvider(games, selected) : []),
    [games, selected],
  );

  if (selected) {
    return (
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6">
        <PageBanner title={selected} count={providerGames.length} countLabel="games" />
        <button
          type="button"
          onClick={() => router.push('/providers')}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#9a7a24] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to providers
        </button>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {providerGames.map((game) => <GameTile key={game.id} game={game} />)}
        </div>
        {!loading && providerGames.length === 0 && (
          <p className="mt-8 text-center text-sm text-[#9a94a8]">
            No games available from {selected} right now.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6">
      <PageBanner title="Game Providers" count={providers.length || null} countLabel="Partners" />
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl border border-black/[0.06] bg-white/70 p-4 shadow-sm sm:grid-cols-4 lg:grid-cols-8">
        {providers.map(({ name, count }) => (
          <ProviderTile key={name} name={name} count={count} />
        ))}
      </div>
      {!loading && providers.length === 0 && (
        <p className="mt-8 text-center text-sm text-[#9a94a8]">No providers available right now.</p>
      )}
    </div>
  );
}
