import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../services/api';

// Shared cache so every mounted carousel stays in sync and renders instantly.
// The cache is only ever a *seed*: we always revalidate in the background
// (stale-while-revalidate) so banners the product admin adds, edits, reorders or
// hides show up without restarting the app.
let memoryCache = null;
let inflight = null;
const subscribers = new Set();

function publish(banners) {
  const changed = JSON.stringify(memoryCache) !== JSON.stringify(banners);
  memoryCache = banners;
  if (changed) subscribers.forEach((fn) => fn(banners));
  return changed;
}

function fetchBanners() {
  if (inflight) return inflight;
  inflight = api('/api/v1/banners')
    .then((data) => {
      const banners = Array.isArray(data) ? data : [];
      publish(banners);
      return banners;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Active home hero banners set by the product admin. Returns [] until loaded and
// whenever none are configured, so callers fall back to their default hero.
export function useBanners() {
  const [banners, setBanners] = useState(() => memoryCache ?? []);
  const [loading, setLoading] = useState(() => memoryCache === null);

  useEffect(() => {
    let active = true;
    const onChange = (next) => {
      if (active) setBanners(next);
    };
    subscribers.add(onChange);

    const revalidate = () =>
      fetchBanners()
        // Keep whatever we last had on a transient failure.
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });

    revalidate();

    // Pick up admin edits when the player returns to the app.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') revalidate();
    });

    return () => {
      active = false;
      subscribers.delete(onChange);
      sub.remove();
    };
  }, []);

  return { banners, loading };
}
