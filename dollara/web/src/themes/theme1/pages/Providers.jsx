'use client';

// Providers — the full game-provider directory behind the home page's "Game
// Providers ▸ View all". Two states in one page:
//   • no ?provider=  → every provider the catalog carries, as a card grid
//   • ?provider=Name → that provider's games, with a way back to the directory
// Provider names/logos/counts come from the shared catalog (useGameCatalog)
// rather than a hardcoded list, so the directory always matches what the
// product actually offers. Styled to theme1's own dark-glass language (see
// Games.jsx / BetHistory.jsx) — reuses the shared <GameCard/> so a game tile
// here looks identical to one on /games/*.

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { GameCard } from '@/components/GameCard';
import { filterByProvider } from '@/lib/gameRoutes';

// Above the whole catalog, so every provider and every game is represented —
// the rails elsewhere can truncate happily, but a directory that undercounts
// a provider (or drops one whose titles all sort past a cut) is just wrong.
const CATALOG_LIMIT = 2000;
const PROVIDERS_HREF = '/providers';

function providerHref(name) {
  return name ? `${PROVIDERS_HREF}?provider=${encodeURIComponent(name)}` : PROVIDERS_HREF;
}

function ProviderTile({ name, logoUrl, count }) {
  return (
    <Link
      href={providerHref(name)}
      title={name}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-hairline/[0.07] bg-panel/60 p-5 text-center transition hover:-translate-y-1 hover:border-brand-400/40 hover:bg-panel"
    >
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline/10 bg-panel-strong p-2">
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
          <span className="line-clamp-2 text-[0.6rem] font-black uppercase leading-tight tracking-wide text-app-fg/80">
            {name}
          </span>
        )}
      </span>
      <span className="w-full truncate text-sm font-bold text-app-fg">{name}</span>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
        {count} {count === 1 ? 'game' : 'games'}
      </span>
    </Link>
  );
}

export default function Theme1Providers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = (searchParams.get('provider') ?? '').trim();
  // One catalog read serves both states: the directory counts games per
  // provider and the detail view filters the same list.
  const { games, loading } = useGameCatalog({ limit: CATALOG_LIMIT });

  // name -> { name, logoUrl, count }, first-seen order (catalog order).
  const providers = useMemo(() => {
    const seen = new Map();
    games.forEach((g) => {
      if (!g.provider_name) return;
      const entry = seen.get(g.provider_name) ?? {
        name: g.provider_name,
        logoUrl: g.provider_logo_url || null,
        count: 0,
      };
      entry.count += 1;
      seen.set(g.provider_name, entry);
    });
    return [...seen.values()];
  }, [games]);

  const providerGames = useMemo(
    () => (selected ? filterByProvider(games, selected) : []),
    [games, selected],
  );

  if (selected) {
    return (
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8">
        <button
          type="button"
          onClick={() => router.push(PROVIDERS_HREF)}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-400 transition hover:text-brand-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All providers
        </button>
        <h1 className="mt-3 text-2xl font-bold">{selected}</h1>

        {loading ? (
          <p className="mt-8 text-center text-muted">Loading games…</p>
        ) : providerGames.length === 0 ? (
          <p className="mt-8 text-center text-muted">
            No games available from {selected} right now.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {providerGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Game Providers</h1>
      <p className="mt-1 text-sm text-muted">
        Every studio powering the catalog — pick one to see its games.
      </p>

      {loading ? (
        <p className="mt-8 text-center text-muted">Loading providers…</p>
      ) : providers.length === 0 ? (
        <p className="mt-8 text-center text-muted">No providers available right now.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {providers.map((p) => (
            <ProviderTile key={p.name} name={p.name} logoUrl={p.logoUrl} count={p.count} />
          ))}
        </div>
      )}
    </main>
  );
}
