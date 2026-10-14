'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

const STORAGE_KEY = 'banners:v1';

// Shared caches so the carousel renders instantly and every mounted carousel on
// the page stays in sync. The cache is only ever a *seed*: we always revalidate
// against the server in the background (stale-while-revalidate) so banners the
// product admin adds, edits, reorders, or hides show up without a hard refresh.
let memoryCache = null;
let inflight = null;
const subscribers = new Set();

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(banners) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(banners));
  } catch {
    // sessionStorage full/unavailable — fall back to memory cache only.
  }
}

function getCached() {
  if (memoryCache) return memoryCache;
  const fromSession = readSession();
  if (fromSession) {
    memoryCache = fromSession;
    return fromSession;
  }
  return null;
}

// Only notify subscribers when the banner set actually changed, so a background
// revalidation that returns the same data doesn't cause needless re-renders (or
// reset a carousel the user is mid-way through).
function publish(banners) {
  const changed = JSON.stringify(memoryCache) !== JSON.stringify(banners);
  memoryCache = banners;
  writeSession(banners);
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

// Active home-page hero banners set by the product admin. Returns [] until
// loaded and whenever none are configured, so callers fall back to their
// default hero. Serves any cached snapshot immediately, then revalidates in the
// background (and again whenever the tab regains focus) so admin changes to the
// banner list — including reordering — propagate to the live site.
export function useBanners() {
  // Initial state must match the server render (no cache available there) to
  // avoid a hydration mismatch. The cache is read inside the effect below,
  // which only runs on the client after hydration.
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const cached = getCached();
    if (cached) {
      setBanners(cached);
      setLoading(false);
    }

    const onChange = (next) => {
      if (active) setBanners(next);
    };
    subscribers.add(onChange);

    const revalidate = () =>
      fetchBanners()
        .catch(() => {
          // Keep whatever we last had on a transient failure.
        })
        .finally(() => {
          if (active) setLoading(false);
        });

    // Always revalidate on mount, even with a cache hit, so the carousel can't
    // get stuck showing a stale snapshot from earlier in the session.
    revalidate();

    // Pick up admin edits when the operator switches back to the site tab.
    const onFocus = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    window.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      subscribers.delete(onChange);
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { banners, loading };
}
