'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

const STORAGE_KEY = 'banners:v1';

// Shared caches so the carousel never re-hits the server as the user navigates
// around the app during a session.
let memoryCache = null;
let inflight = null;

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

function fetchBanners() {
  if (inflight) return inflight;
  inflight = api('/api/v1/banners')
    .then((data) => {
      const banners = Array.isArray(data) ? data : [];
      memoryCache = banners;
      writeSession(banners);
      return banners;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Active home-page hero banners set by the product admin. Returns [] until
// loaded and whenever none are configured, so callers fall back to their
// default hero.
export function useBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const hit = getCached();
    if (hit) {
      setBanners(hit);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    fetchBanners()
      .then((data) => {
        if (active) setBanners(data);
      })
      .catch(() => {
        if (active) setBanners([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { banners, loading };
}
