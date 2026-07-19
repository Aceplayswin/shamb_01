/* eslint-env jest */

// Theme resolution and catalog filtering — the pure logic behind what the
// screens render. Cases here mirror what the live API actually returns.

import { buildPalette, DEFAULT_THEME, withAlpha } from '../src/themes/palettes';
import { getTheme, resolveScreen, resolveShell, ROUTE_KEYS } from '../src/themes/registry';
import {
  categoryFromSlug,
  filterByCategory,
  filterByProvider,
  filterFeatured,
  searchGames,
} from '../src/lib/gameRoutes';

// The palette the product API serves for theme1 today.
const LIVE_COLORS = {
  primary: '#F5C542',
  accent: '#FFB800',
  app_bg: '#0B0F14',
  app_fg: '#FFFFFF',
  rail: '#0B0F14',
  panel: '#151A21',
  panel_strong: '#0B0F14',
  muted: '#9CA3AF',
  hairline: '#FFFFFF',
};

describe('palette', () => {
  it('falls back to theme1 defaults when Super Admin sent nothing', () => {
    const t = buildPalette('theme1', null);
    expect(t.appBg).toBe('#0B0F14');
    expect(t.panel).toBe('#151A21');
    expect(t.muted).toBe('#9CA3AF');
    // The hand-tuned amber ramp, not a derived one.
    expect(t.brand[500]).toBe('#f5c542');
    expect(t.brand[600]).toBe('#ffb800');
  });

  it('keeps the designed ramp when the live palette matches the default', () => {
    const t = buildPalette('theme1', LIVE_COLORS);
    expect(t.brand[600]).toBe('#ffb800');
    expect(t.accent).toBe('#FFB800');
  });

  it('derives a full ramp from an operator-chosen primary', () => {
    const t = buildPalette('theme1', { ...LIVE_COLORS, primary: '#3B82F6' });
    expect(t.brand[500]).toBe('#3b82f6');
    // Tints lighten toward white, shades darken toward black.
    expect(t.brand[50]).not.toBe(t.brand[500]);
    expect(t.brand[950]).not.toBe(t.brand[500]);
    const lum = (hex) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(lum(t.brand[50])).toBeGreaterThan(lum(t.brand[500]));
    expect(lum(t.brand[950])).toBeLessThan(lum(t.brand[500]));
  });

  it('honours individual token overrides without losing the rest', () => {
    const t = buildPalette('theme1', { app_bg: '#101820' });
    expect(t.appBg).toBe('#101820');
    expect(t.panel).toBe('#151A21'); // untouched default
  });

  it('ignores blank values so an empty admin field cannot wipe a default', () => {
    const t = buildPalette('theme1', { app_bg: '   ', muted: '' });
    expect(t.appBg).toBe('#0B0F14');
    expect(t.muted).toBe('#9CA3AF');
  });

  it('falls back to the default theme for an unknown key', () => {
    expect(buildPalette('theme99', null).appBg).toBe(buildPalette(DEFAULT_THEME, null).appBg);
  });

  it('builds rgba strings for translucent tokens', () => {
    expect(withAlpha('#FFFFFF', 0.07)).toBe('rgba(255, 255, 255, 0.07)');
    expect(buildPalette('theme1', null).hairline(0.1)).toBe('rgba(255, 255, 255, 0.1)');
  });
});

describe('registry', () => {
  it('resolves theme1 for every route key', () => {
    ROUTE_KEYS.forEach((key) => {
      expect(resolveScreen('theme1', key)).toBeTruthy();
    });
  });

  it('falls back to the default theme for an unbuilt theme key', () => {
    // theme2 is registered in the palette but has no screens yet.
    expect(resolveScreen('theme2', 'home')).toBe(resolveScreen(DEFAULT_THEME, 'home'));
    expect(resolveShell('theme2')).toBe(resolveShell(DEFAULT_THEME));
    expect(getTheme('nope')).toBe(getTheme(DEFAULT_THEME));
  });

  it('exposes the chrome the navigator needs', () => {
    const Shell = resolveShell('theme1');
    expect(Shell.TopBar).toBeTruthy();
    expect(Shell.TabBar).toBeTruthy();
    expect(Shell.tabs.length).toBeGreaterThan(0);
    // Every tab must name a screen the registry can actually resolve, or the
    // navigator mounts `component={null}` and the app crashes on launch.
    Shell.tabs.forEach((tab) => {
      expect(resolveScreen('theme1', tab.screen)).toBeTruthy();
      expect(tab.name).toBeTruthy();
    });
    // Route names must be unique — react-navigation silently keeps only one.
    const names = Shell.tabs.map((tab) => tab.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('catalog filtering', () => {
  // Proportions mirror the live catalog: mostly slots, a handful of sports, and
  // — importantly — nothing flagged featured.
  const games = [
    { id: 1, name: 'Luck Sports', category: 'sports', provider_name: 'Sportsbook', play_count: 9, is_featured: false },
    { id: 2, name: 'Virtual Cup', category: 'virtual_sports', provider_name: 'Sportsbook', play_count: 4, is_featured: false },
    { id: 3, name: 'Live Roulette', category: 'live_casino', provider_name: 'Evolution', play_count: 25, is_featured: false },
    { id: 4, name: 'Aviator', category: 'ai_games', provider_name: 'Aviatrix', play_count: 40, is_featured: false },
    { id: 5, name: 'Sweet Bonanza', category: 'slots', provider_name: 'Pragmatic', play_count: 31, is_featured: false },
  ];

  it('groups the home rails the way the screen does', () => {
    expect(filterByCategory(games, ['sports', 'virtual_sports'])).toHaveLength(2);
    expect(filterByCategory(games, ['live_casino', 'ai_games'])).toHaveLength(2);
    expect(filterByCategory(games, 'slots')).toHaveLength(1);
  });

  // The live catalog has zero featured games, so "Trending" must fall back to
  // most-played rather than rendering an empty rail.
  it('falls back to most-played when nothing is flagged featured', () => {
    const trending = filterFeatured(games, 3);
    expect(trending).toHaveLength(3);
    expect(trending.map((g) => g.id)).toEqual([4, 5, 3]);
  });

  it('prefers explicitly featured games when they exist', () => {
    const withFeatured = [...games, { id: 6, name: 'Pick', category: 'slots', play_count: 0, is_featured: true }];
    expect(filterFeatured(withFeatured, 3).map((g) => g.id)).toEqual([6]);
  });

  it('filters by provider and search the way the chips and search box do', () => {
    expect(filterByProvider(games, 'Sportsbook')).toHaveLength(2);
    expect(searchGames(games, 'roulette').map((g) => g.id)).toEqual([3]);
    expect(searchGames(games, 'evolution').map((g) => g.id)).toEqual([3]);
    expect(searchGames(games, '')).toHaveLength(games.length);
  });

  it('maps category slugs onto API values', () => {
    expect(categoryFromSlug('live-casino')).toBe('live_casino');
    expect(categoryFromSlug('ai')).toBe('ai_games');
    expect(categoryFromSlug('slots')).toBe('slots');
  });
});
