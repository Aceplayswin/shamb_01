'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export function useGameCatalog({ limit = 300 } = {}) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/api/v1/games?limit=${limit}`)
      .then((data) => {
        if (active) {
          setGames(Array.isArray(data) ? data : []);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) {
          setGames([]);
          setError(e.message ?? 'Failed to load games');
        }
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
