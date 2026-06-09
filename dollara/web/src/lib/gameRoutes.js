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
};

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
