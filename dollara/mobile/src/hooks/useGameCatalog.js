import { useEffect, useState } from 'react';
import { api } from '../services/api';

// In-memory catalog cache shared across the whole app for the lifetime of the
// process, so moving between tabs never re-hits the server. (The web mirrors
// this into sessionStorage; on mobile the process *is* the session.)
const memoryCache = new Map(); // limit -> games[]
const inflight = new Map(); // limit -> Promise<games[]>

function fetchCatalog(limit) {
  if (inflight.has(limit)) return inflight.get(limit);

  const request = api(`/api/v1/games?limit=${limit}`)
    .then((data) => {
      const games = Array.isArray(data) ? data : [];
      memoryCache.set(limit, games);
      return games;
    })
    .finally(() => {
      inflight.delete(limit);
    });

  inflight.set(limit, request);
  return request;
}

// Imperative accessor for code that needs the catalog outside of React state
// (e.g. resolving a game by slug). Reuses the same cache.
export function loadGameCatalog(limit = 300) {
  const cached = memoryCache.get(limit);
  if (cached) return Promise.resolve(cached);
  return fetchCatalog(limit);
}

export function useGameCatalog({ limit = 300 } = {}) {
  const [games, setGames] = useState(() => memoryCache.get(limit) ?? []);
  const [loading, setLoading] = useState(() => !memoryCache.has(limit));
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const hit = memoryCache.get(limit);
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
