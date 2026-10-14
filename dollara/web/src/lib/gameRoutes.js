// Category slug (URL segment) ↔ API category values.
export const CATEGORY_SLUGS = {
  lottery: 'lottery',
  'live-casino': 'live_casino',
  sports: 'sports',
  slots: 'slots',
  fantasy: 'fantasy',
  ai: 'ai_games',
};

export const NAV_GAME_LINKS = {
  sports: '/games/sports',
  casino: '/games/live-casino',
  slots: '/games/slots',
  fantasy: '/games/fantasy',
  lottery: '/games/lottery',
  crash: '/games/ai',
  liveCasino: '/games/live-casino',
  // The whole catalog, uncategorised — the home page's "All Games ▸ See All".
  // `all` is not a real category: the listing treats it as "no category filter".
  allGames: '/games/all',
};

// The full provider directory — where the home page's "Game Providers ▸ View All"
// goes. A provider's own tile deep-links into it with ?provider=<name>, which the
// listing resolves to that provider's games (the games endpoint matches a search
// term against provider name as well as game name/slug).
export const PROVIDERS_HREF = '/providers';

export function providerHref(providerName) {
  return providerName
    ? `${PROVIDERS_HREF}?provider=${encodeURIComponent(providerName)}`
    : PROVIDERS_HREF;
}

export function categoryFromSlug(slug) {
  return CATEGORY_SLUGS[slug] ?? slug;
}

export function playPath(game) {
  return `/play/${game.slug}`;
}

export function filterByCategory(games, categories) {
  const set = new Set(Array.isArray(categories) ? categories : [categories]);
  return games.filter((g) => set.has(g.category));
}

export function filterFeatured(games, limit = 12) {
  const featured = games.filter((g) => g.is_featured);
  const pool = featured.length ? featured : [...games].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
  return pool.slice(0, limit);
}

export function filterByProvider(games, providerName) {
  if (!providerName) return games;
  const needle = providerName.toLowerCase();
  return games.filter((g) => g.provider_name?.toLowerCase().includes(needle));
}

export function searchGames(games, query) {
  if (!query?.trim()) return games;
  const q = query.trim().toLowerCase();
  return games.filter(
    (g) =>
      g.name?.toLowerCase().includes(q) ||
      g.provider_name?.toLowerCase().includes(q) ||
      g.slug?.toLowerCase().includes(q),
  );
}

// Distinct provider names present in a catalog, in catalog order (the games
// endpoint already sorts by sort_order / play_count, so the most prominent
// providers come first). Unlike the home rail this caps nothing — the directory
// is meant to show every provider the product carries.
export function providerNames(games) {
  const seen = [];
  games.forEach((g) => {
    if (g.provider_name && !seen.includes(g.provider_name)) seen.push(g.provider_name);
  });
  return seen;
}

// The same distinct providers, each with the vendor logo the admin set against
// it (games API: `provider_logo_url`). `logoUrl` is null when the provider has
// no logo, so callers fall back to rendering the name.
export function providerEntries(games) {
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
