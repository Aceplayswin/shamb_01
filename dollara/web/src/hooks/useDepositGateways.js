'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

// Payment gateways the player can pick on the deposit page (Paygate's
// checkout popup, P2P·PAY's hosted UPI / bank page, …). The API lists only
// gateways that are switched on and configured, in the operator's order, so
// the first one is the sensible default selection.
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
        const list = Array.isArray(data) ? data : [];
        setGateways(list);
        setSelected((current) =>
          list.some((g) => g.code === current) ? current : list[0]?.code ?? null,
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

  return { gateways, selected, selectedGateway, setSelected, loading, error };
}

export default useDepositGateways;
