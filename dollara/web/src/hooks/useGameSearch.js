'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

// Debounced, API-backed game search. Hits /api/v1/games?search=… only after the
// user pauses typing (debounceMs), and aborts the in-flight request when the
// query changes again so results never arrive out of order.
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

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api(`/api/v1/games?search=${encodeURIComponent(term)}&limit=${limit}`, {
        signal: controller.signal,
      })
        .then((data) => setResults(Array.isArray(data) ? data : []))
        .catch((err) => {
          if (err?.name !== 'AbortError') setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, limit, debounceMs]);

  return { results, loading };
}
