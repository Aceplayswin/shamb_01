'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

// The deposit methods the admin has switched on (Cashier → Payment Methods),
// each carrying the destination the player pays into. There is deliberately no
// static fallback: what appears on the deposit page is exactly what the admin
// configured, and an empty list renders as "nothing available" rather than a
// made-up method the player could not actually pay into.
//
// `enabled` lets a page wait for the auth token to hydrate — the endpoint is
// player-only, so calling it before that only produces a 401.
export function useDepositMethods(enabled = true) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    api('/api/v1/wallet/deposit/methods')
      .then((data) => {
        if (!active) return;
        setMethods(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!active) return;
        setMethods([]);
        // A 503 from the API carries the operator-facing reason; a network
        // failure gets a generic line. Either way the page shows the message.
        setError(e instanceof Error ? e.message : 'Could not load payment methods');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { methods, loading, error };
}

export default useDepositMethods;
