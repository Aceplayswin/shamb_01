import { useEffect, useState } from 'react';
import { api } from '../services/api';

// Active, player-facing bonuses configured by the product admin. Public and
// keyless, so the promotions screen renders live offers instead of a fixed list.
export function usePromotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api('/api/v1/promotions')
      .then((data) => active && setPromotions(Array.isArray(data) ? data : []))
      .catch(() => active && setPromotions([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { promotions, loading };
}
