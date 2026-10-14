'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

const STORAGE_KEY = 'faqs:v1';

// Shared caches so every theme's FAQ section renders instantly and stays in sync.
// The cache is only ever a *seed*: we always revalidate against the server in the
// background (stale-while-revalidate) so FAQs the product admin adds, edits,
// reorders, or hides show up without a hard refresh.
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

function writeSession(faqs) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(faqs));
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

// Only notify subscribers when the FAQ set actually changed, so a background
// revalidation that returns the same data doesn't cause needless re-renders.
function publish(faqs) {
  const changed = JSON.stringify(memoryCache) !== JSON.stringify(faqs);
  memoryCache = faqs;
  writeSession(faqs);
  if (changed) subscribers.forEach((fn) => fn(faqs));
  return changed;
}

function fetchFaqs() {
  if (inflight) return inflight;
  inflight = api('/api/v1/faqs')
    .then((data) => {
      const faqs = Array.isArray(data) ? data : [];
      publish(faqs);
      return faqs;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Active home-page FAQs set by the product admin. Returns [] until loaded and
// whenever none are configured, so callers can hide the section. Serves any
// cached snapshot immediately, then revalidates in the background (and again
// whenever the tab regains focus) so admin changes propagate to the live site.
export function useFaqs() {
  // Initial state must match the server render (no cache available there) to
  // avoid a hydration mismatch. The cache is read inside the effect below,
  // which only runs on the client after hydration.
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const cached = getCached();
    if (cached) {
      setFaqs(cached);
      setLoading(false);
    }

    const onChange = (next) => {
      if (active) setFaqs(next);
    };
    subscribers.add(onChange);

    const revalidate = () =>
      fetchFaqs()
        .catch(() => {
          // Keep whatever we last had on a transient failure.
        })
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

  return { faqs, loading };
}
