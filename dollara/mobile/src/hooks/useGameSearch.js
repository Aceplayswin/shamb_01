import { useEffect, useState } from 'react';
import { api } from '../services/api';

// Debounced, API-backed game search. Hits /api/v1/games?search=… only after the
// user pauses typing, and drops results from a superseded query so they never
// arrive out of order.
export function useGameSearch(query, { limit = 60, debounceMs = 300 } = {}) {
  const term = (query ?? '').trim();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!term) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api(`/api/v1/games?search=${encodeURIComponent(term)}&limit=${limit}`)
        .then((data) => active && setResults(Array.isArray(data) ? data : []))
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, debounceMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, limit, debounceMs]);

  return { results, loading };
}
