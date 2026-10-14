'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

const STORAGE_KEY = 'promotionPosters:v1';

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

function writeSession(posters) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(posters));
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

function publish(posters) {
  const changed = JSON.stringify(memoryCache) !== JSON.stringify(posters);
  memoryCache = posters;
  writeSession(posters);
  if (changed) subscribers.forEach((fn) => fn(posters));
  return changed;
}

function fetchPosters() {
  if (inflight) return inflight;
  inflight = api('/api/v1/promotion-posters')
    .then((data) => {
      const posters = Array.isArray(data) ? data : [];
      publish(posters);
      return posters;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Active offer posters from admin Content → Promotions. Shown on /promotions
// as image posters (not bonus claim cards). Revalidates on mount and focus.
export function usePromotionPosters() {
  const [posters, setPosters] = useState(() => getCached() ?? []);
  const [loading, setLoading] = useState(() => getCached() === null);

  useEffect(() => {
    let active = true;
    const onChange = (next) => {
      if (active) setPosters(next);
    };
    subscribers.add(onChange);

    const revalidate = () =>
      fetchPosters()
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });

    revalidate();

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

  return { posters, loading };
}
