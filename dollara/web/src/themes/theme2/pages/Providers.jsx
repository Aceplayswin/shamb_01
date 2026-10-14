'use client';

// Theme2 Providers — the full game-provider directory behind Home's "Top
// Providers" row. Two states in one page:
//   • no ?provider=  → every provider the catalog carries, as a directory grid
//   • ?provider=Name → that provider's games, with a way back to the directory
// Provider names come from the shared catalog (no hardcoded logo list), so the
// directory always matches what the product actually offers. dollara's shared
// gameRoutes.js carries no provider-directory helpers (only mahakalworld's
// theme5 needed them), so the grouping/href logic lives here, page-local.

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Play } from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { filterByProvider, playPath } from '@/lib/gameRoutes';

// Above the whole catalog, so every provider and every game is represented.
const CATALOG_LIMIT = 2000;

const HUES = [
  'from-amber-500/30',
  'from-emerald-500/30',
  'from-fuchsia-500/30',
  'from-rose-500/30',
  'from-sky-500/30',
  'from-indigo-500/30',
];

function providerHref(name) {
  return `/providers?provider=${encodeURIComponent(name)}`;
}

function providerInitials(name) {
  return (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProviderCircle({ name, count, hue }) {
  return (
    <Link href={providerHref(name)} title={name} className="group flex flex-col items-center gap-2">
      <span
        className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border border-white/5 bg-gradient-to-br ${hue} via-[#0d1420] to-[#070d16] text-center shadow-inner transition group-hover:border-amber-400/50`}
      >
        <span className="text-sm font-black uppercase tracking-wide text-white">
          {providerInitials(name)}
        </span>
      </span>
      <span className="max-w-[6.5rem] truncate text-xs font-bold text-slate-200">{name}</span>
      <span className="text-[0.65rem] text-slate-500">
        {count} {count === 1 ? 'game' : 'games'}
      </span>
    </Link>
  );
}

function GameTile({ game, hue }) {
  return (
    <Link href={playPath(game)} className="group flex flex-col text-left">
      <span
        className={`relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${hue} via-[#0d1420] to-[#070d16]`}
      >
        {game.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : null}
        <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/40" />
        <span className="relative grid h-11 w-11 scale-90 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-0 shadow-glow transition group-hover:scale-100 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-black text-black" />
        </span>
      </span>
      <span className="mt-2 truncate text-sm font-bold text-white">{game.name}</span>
      {game.provider_name && <span className="truncate text-xs text-slate-500">{game.provider_name}</span>}
    </Link>
  );
}

export default function Theme2Providers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = (searchParams.get('provider') ?? '').trim();
  // One catalog read serves both states: the directory counts games per
  // provider and the detail view filters the same list. The limit is
  // deliberately above the full catalog size so no provider undercounts.
  const { games, loading } = useGameCatalog({ limit: CATALOG_LIMIT });

  const providers = useMemo(() => {
    const counts = new Map();
    games.forEach((g) => {
      if (g.provider_name) counts.set(g.provider_name, (counts.get(g.provider_name) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count], i) => ({ name, count, hue: HUES[i % HUES.length] }))
      .sort((a, b) => b.count - a.count);
  }, [games]);

  const providerGames = useMemo(
    () => (selected ? filterByProvider(games, selected) : []),
    [games, selected],
  );

  if (selected) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <button
          type="button"
          onClick={() => router.push('/providers')}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-400 hover:text-amber-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Providers
        </button>
        <h1 className="font-display text-2xl font-black text-white">{selected}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {providerGames.length} {providerGames.length === 1 ? 'game' : 'games'} from {selected}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {providerGames.map((game, i) => (
            <GameTile key={game.id} game={game} hue={HUES[i % HUES.length]} />
          ))}
        </div>
        {!loading && providerGames.length === 0 && (
          <p className="mt-10 text-center text-slate-500">No games available from {selected} right now.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-black text-white">
        <Building2 className="h-6 w-6 text-amber-400" /> Game Providers
      </h1>
      <p className="mt-1 text-sm text-slate-400">Every studio powering the lobby, in one directory.</p>

      {loading ? (
        <div className="mt-8 flex flex-wrap gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-20 w-20 animate-pulse rounded-full bg-white/[0.04]" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <p className="mt-10 text-center text-slate-500">No providers available right now.</p>
      ) : (
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-8 rounded-2xl border border-white/5 bg-[#0d1420] p-6">
          {providers.map((p) => (
            <ProviderCircle key={p.name} name={p.name} count={p.count} hue={p.hue} />
          ))}
        </div>
      )}
    </div>
  );
}
