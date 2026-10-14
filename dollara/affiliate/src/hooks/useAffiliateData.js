'use client';

import { useCallback, useEffect, useState } from 'react';
import { affiliateApi } from '../services/affiliateApi';

/**
 * Fetch a path and track loading/error/reload around it.
 *
 * Unlike the admin console's equivalent, `error` here is meant to be rendered —
 * every screen pipes it into <DataState>, so a failed request shows a message
 * and a retry button instead of an empty table that looks like "no data".
 *
 * Pass `null` as the path to skip fetching (a detail panel with nothing
 * selected, for instance).
 */
export function useAffiliateData(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    affiliateApi(path)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

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
    affiliateApi(path)
      .then((res) => active && setData(res))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}
