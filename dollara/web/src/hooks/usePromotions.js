'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

// Active, player-facing bonuses configured by the product admin. Public + keyless
// (mirrors useBanners), so the promotions page can render live offers instead of
// a hardcoded list.
export function usePromotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api('/api/v1/promotions')
      .then((data) => {
        if (active) setPromotions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setPromotions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { promotions, loading };
}
