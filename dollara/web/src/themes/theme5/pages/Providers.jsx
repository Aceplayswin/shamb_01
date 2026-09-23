'use client';

// Theme5 Providers — the full game-provider directory behind the home page's
// "Game Providers ▸ View All". Two states in one page:
//   • no ?provider=  → every provider the catalog carries, as circles
//   • ?provider=Name → that provider's games, with a way back to the directory
// Provider names come from the shared catalog rather than a hardcoded logo list,
// so the directory always matches what the product actually offers.

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { filterByProvider, playPath } from '@/lib/gameRoutes';
import { T5SectionBar } from '../components/ui';

// dollara's shared lib/gameRoutes.js does not (yet) carry a provider-directory
// helper the way mahakalworld's does (PROVIDERS_HREF / providerHref /
// providerEntries) — kept here, local to this page, rather than reaching into
// the shared lib from a single-theme change, so no other theme's build is
// affected by this port.
const PROVIDERS_HREF = '/providers';

function providerHref(providerName) {
  return providerName
    ? `${PROVIDERS_HREF}?provider=${encodeURIComponent(providerName)}`
    : PROVIDERS_HREF;
}

// Distinct provider names present in a catalog, in catalog order, each with
// the vendor logo the admin set against it (games API: `provider_logo_url`).
// `logoUrl` is null when the provider has no logo, so callers fall back to
// rendering the name.
function providerEntries(games) {
  const seen = new Map();
  games.forEach((g) => {
    if (!g.provider_name || seen.has(g.provider_name)) return;
    seen.set(g.provider_name, {
      name: g.provider_name,
      logoUrl: g.provider_logo_url || null,
    });
  });
  return [...seen.values()];
}

// Above the whole catalog, so every provider and every game is represented.
const CATALOG_LIMIT = 2000;

function ProviderCircle({ name, logoUrl, count }) {
  return (
    <Link
      href={providerHref(name)}
      title={name}
      className="group flex flex-col items-center gap-1.5"
    >
      <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-black/[0.07] bg-white p-2 text-center shadow-sm transition group-hover:border-[#1d4ed8] group-hover:shadow-md">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-contain"
            // A dead logo URL must not leave an empty circle.
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <span className="line-clamp-2 text-[0.6rem] font-black uppercase leading-tight tracking-wide text-[#0f1b33]">
            {name}
          </span>
        )}
      </span>
      <span className="text-[0.6rem] font-bold text-[#94a3b8]">
        {count} {count === 1 ? 'game' : 'games'}
      </span>
    </Link>
  );
}

function GameTile({ game }) {
  return (
    <Link href={playPath(game)} className="group flex flex-col text-left">
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

export default function Theme5Providers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = (searchParams.get('provider') ?? '').trim();
  // One catalog read serves both states: the directory counts games per provider
  // and the detail view filters the same list, so switching between them is free.
  // The limit is deliberately above the full catalog size — the rails elsewhere
  // can truncate happily, but a directory that undercounts a provider's games (or
  // drops a provider whose titles all sort past the cut) is just wrong.
  const { games, loading } = useGameCatalog({ limit: CATALOG_LIMIT });

  // name -> game count, in catalog order.
  const providers = useMemo(() => {
    const counts = new Map();
    games.forEach((g) => {
      if (g.provider_name) counts.set(g.provider_name, (counts.get(g.provider_name) ?? 0) + 1);
    });
    return providerEntries(games).map((p) => ({ ...p, count: counts.get(p.name) ?? 0 }));
  }, [games]);

  const providerGames = useMemo(
    () => (selected ? filterByProvider(games, selected) : []),
    [games, selected],
  );

  if (selected) {
    return (
      <div>
        <T5SectionBar title={selected} seeAllHref={PROVIDERS_HREF} seeAllLabel="All Providers" />
        <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => router.push(PROVIDERS_HREF)}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#1d4ed8]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to providers
          </button>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {providerGames.map((game) => <GameTile key={game.id} game={game} />)}
          </div>
          {!loading && providerGames.length === 0 && (
            <p className="py-8 text-center text-sm text-[#94a3b8]">
              No games available from {selected} right now.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <T5SectionBar title="Game Providers" />
      <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
        {/* Wraps instead of scrolling horizontally: this is the full directory,
            so every provider should be reachable without dragging a rail. */}
        <div className="flex flex-wrap gap-4">
          {providers.map(({ name, logoUrl, count }) => (
            <ProviderCircle key={name} name={name} logoUrl={logoUrl} count={count} />
          ))}
        </div>
        {!loading && providers.length === 0 && (
          <p className="py-8 text-center text-sm text-[#94a3b8]">
            No providers available right now.
          </p>
        )}
      </div>
    </div>
  );
}
