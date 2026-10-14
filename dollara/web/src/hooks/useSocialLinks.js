'use client';

// Social / support URLs authored in Admin → Content → Social Links.
// Serves a cached snapshot immediately, then revalidates in the background
// (and again when the tab regains focus) so admin edits reach the live site.

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { SOCIAL_LINKS_DEFAULTS } from '@/lib/support';

const STORAGE_KEY = 'social-links:v1';

let memoryCache = null;
let inflight = null;
const subscribers = new Set();

function normalize(data) {
  const next = { ...SOCIAL_LINKS_DEFAULTS };
  if (!data || typeof data !== 'object') return next;
  for (const key of Object.keys(SOCIAL_LINKS_DEFAULTS)) {
    const raw = data[key];
    next[key] = typeof raw === 'string' ? raw.trim() : SOCIAL_LINKS_DEFAULTS[key];
  }
  return next;
}

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeSession(links) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {
    // ignore quota / private mode
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

function publish(links) {
  const changed = JSON.stringify(memoryCache) !== JSON.stringify(links);
  memoryCache = links;
  writeSession(links);
  if (changed) subscribers.forEach((fn) => fn(links));
  return changed;
}

function fetchSocialLinks() {
  if (inflight) return inflight;
  inflight = api('/api/v1/social-links')
    .then((data) => {
      const links = normalize(data);
      publish(links);
      return links;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useSocialLinks() {
  const [links, setLinks] = useState(() => getCached() ?? SOCIAL_LINKS_DEFAULTS);
  const [loading, setLoading] = useState(() => getCached() === null);

  useEffect(() => {
    let active = true;
    const onChange = (next) => {
      if (active) setLinks(next);
    };
    subscribers.add(onChange);

    const revalidate = () =>
      fetchSocialLinks()
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

  return { links, loading, whatsappUrl: links.whatsapp };
}
