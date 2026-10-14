'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

// Bump this version whenever a server-side change makes an already-cached
// catalog wrong. Entries under an older prefix are purged on first use (see
// purgeStaleVersions), so a returning visitor is not left on stale data.
//
// v2: the provider remap (api/database/fix_game_providers.sql) repointed every
// game from the old vertical-named providers ("Live Casino", "Slots") to its
// real vendor. Sessions cached under v1 kept rendering the old names in the
// home page's Game Providers row.
const STORAGE_VERSION = 'v2';
const STORAGE_PREFIX = `gameCatalog:${STORAGE_VERSION}:`;

/** Drop catalog entries written by an earlier STORAGE_VERSION. */
function purgeStaleVersions() {
  if (typeof window === 'undefined') return;
  try {
    const stale = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith('gameCatalog:') && !key.startsWith(STORAGE_PREFIX)) {
        stale.push(key);
      }
    }
    stale.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Private mode / disabled storage — nothing to purge.
  }
}

// In-memory cache shared across the whole app for the lifetime of the page
// session. Survives client-side navigation and component remounts so we never
// re-hit the server while the user moves around the app.
const memoryCache = new Map(); // cacheKey -> games[]
const inflight = new Map(); // cacheKey -> Promise<games[]>

// Requests are identified by category + limit, so a category rail and the full
// catalog never overwrite each other's cache entry.
function cacheKey({ category, featured, limit }) {
  return `${category ?? 'all'}:${featured ? 'featured' : 'any'}:${limit}`;
}

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

let purged = false;

function readSession(key) {
  if (typeof window === 'undefined') return null;
  if (!purged) {
    purged = true;
    purgeStaleVersions();
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(key, games) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(games));
  } catch {
    // sessionStorage may be full or unavailable (private mode) — ignore and
    // fall back to the in-memory cache only.
  }
}

function getCached(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  const fromSession = readSession(key);
  if (fromSession) {
    memoryCache.set(key, fromSession);
    return fromSession;
  }
  return null;
}

function fetchCatalog({ category, featured, limit }) {
  const key = cacheKey({ category, featured, limit });
  if (inflight.has(key)) return inflight.get(key);

  const params = new URLSearchParams({ limit: String(limit) });
  if (category) params.set('category', category);
  if (featured) params.set('featured', 'true');

  const request = api(`/api/v1/games?${params}`)
    .then((data) => {
      const games = Array.isArray(data) ? data : [];
      memoryCache.set(key, games);
      writeSession(key, games);
      return games;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

// Imperative accessor for code that needs the catalog outside of React state
// (e.g. resolving a game by slug). Reuses the same session cache, so it never
// hits the server when the catalog is already loaded.
export function loadGameCatalog(limit = 300) {
  const cached = getCached(cacheKey({ limit }));
  if (cached) return Promise.resolve(cached);
  return fetchCatalog({ limit });
}

export function useGameCatalog({ limit = 300, category, featured } = {}) {
  // Initial state must match the server render (no cache available there) to
  // avoid a hydration mismatch. The cache is read inside the effect below,
  // which only runs on the client after hydration.
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    // Cache hit: the catalog is already loaded for this session. Until a hard
    // refresh / new tab clears the session, we never call the server again.
    const key = cacheKey({ category, featured, limit });
    const hit = getCached(key);
    if (hit) {
      setGames(hit);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    fetchCatalog({ category, featured, limit })
      .then((data) => {
        if (!active) return;
        setGames(data);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setGames([]);
        setError(e.message ?? 'Failed to load games');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [limit, category, featured]);

  return { games, loading, error };
}
