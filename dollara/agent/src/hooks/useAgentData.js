'use client';

import { useCallback, useEffect, useState } from 'react';
import { agentApi } from '../services/agentApi';

/**
 * Fetch a path and track loading/error/reload around it.
 *
 * `error` is meant to be rendered — every screen pipes it into <DataState>, so
 * a failed request shows a message and a retry button instead of an empty table
 * that reads as "no data". On a P&L report those two are very different things.
 *
 * Pass `null` as the path to skip fetching (a report that has not been searched
 * yet, for instance).
 */
export function useAgentData(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    // A request in flight when the deps change must not overwrite the newer
    // result, so late responses are dropped rather than applied out of order.
    let active = true;
    if (!path) {
      setData(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    agentApi(path)
      .then((res) => active && setData(res))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload, setData };
}
