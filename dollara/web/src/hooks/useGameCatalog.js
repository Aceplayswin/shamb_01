'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

const STORAGE_PREFIX = 'gameCatalog:v1:';

// In-memory cache shared across the whole app for the lifetime of the page
// session. Survives client-side navigation and component remounts so we never
// re-hit the server while the user moves around the app.
const memoryCache = new Map(); // limit -> games[]
const inflight = new Map(); // limit -> Promise<games[]>

function storageKey(limit) {
  return `${STORAGE_PREFIX}${limit}`;
}

function readSession(limit) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(limit));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(limit, games) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(limit), JSON.stringify(games));
  } catch {
    // sessionStorage may be full or unavailable (private mode) — ignore and
    // fall back to the in-memory cache only.
  }
}

function getCached(limit) {
  if (memoryCache.has(limit)) return memoryCache.get(limit);
  const fromSession = readSession(limit);
  if (fromSession) {
    memoryCache.set(limit, fromSession);
    return fromSession;
  }
  return null;
}

function fetchCatalog(limit) {
  if (inflight.has(limit)) return inflight.get(limit);

  const request = api(`/api/v1/games?limit=${limit}`)
    .then((data) => {
      const games = Array.isArray(data) ? data : [];
      memoryCache.set(limit, games);
      writeSession(limit, games);
      return games;
    })
    .finally(() => {
      inflight.delete(limit);
    });

  inflight.set(limit, request);
  return request;
}

// Imperative accessor for code that needs the catalog outside of React state
// (e.g. resolving a game by slug). Reuses the same session cache, so it never
// hits the server when the catalog is already loaded.
export function loadGameCatalog(limit = 300) {
  const cached = getCached(limit);
  if (cached) return Promise.resolve(cached);
  return fetchCatalog(limit);
}

export function useGameCatalog({ limit = 300 } = {}) {
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
    const hit = getCached(limit);
    if (hit) {
      setGames(hit);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    fetchCatalog(limit)
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
  }, [limit]);

  return { games, loading, error };
}
