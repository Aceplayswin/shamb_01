import { useEffect, useState } from 'react';
import { api } from '../services/api';

// Real settled wins across all players (/api/v1/games/big-wins). Public and
// keyless; the API masks player names before they leave the server.
export function useBigWins(limit = 8, refreshMs = 45000) {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () =>
      api(`/api/v1/games/big-wins?limit=${limit}`)
        .then((data) => active && setWins(Array.isArray(data) ? data : []))
        .catch(() => active && setWins([]))
        .finally(() => active && setLoading(false));

    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [limit, refreshMs]);

  return { wins, loading };
}
