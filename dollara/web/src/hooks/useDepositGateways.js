'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';

// Payment options on the deposit page: Instant Checkout (Paygate popup),
// UPI / Bank Transfer (P2P·PAY hosted page) and Manual Payment (UTR +
// screenshot, admin-verified). The API returns every option in the operator's
// order with `available: false` for ones not set up yet — those are shown but
// cannot be chosen. The first available option is selected by default.
//
// `enabled` lets a page wait for the auth token — the endpoint is player-only.
export function useDepositGateways(enabled = true) {
  const [gateways, setGateways] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    api('/api/v1/wallet/deposit/gateways')
      .then((data) => {
        if (!active) return;
        const list = (Array.isArray(data) ? data : []).map((g) => ({
          ...g,
          // Older API builds only listed usable gateways.
          available: g.available !== false,
        }));
        setGateways(list);
        setSelected((current) =>
          list.some((g) => g.code === current && g.available)
            ? current
            : list.find((g) => g.available)?.code ?? null,
        );
      })
      .catch((e) => {
        if (!active) return;
        setGateways([]);
        setSelected(null);
        setError(e instanceof Error ? e.message : 'Could not load payment methods');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const selectedGateway = gateways.find((g) => g.code === selected) ?? null;

  // An option that is not set up cannot be picked.
  const select = useCallback(
    (code) => {
      if (gateways.some((g) => g.code === code && g.available)) setSelected(code);
    },
    [gateways],
  );

  return { gateways, selected, selectedGateway, setSelected: select, loading, error };
}

export default useDepositGateways;
