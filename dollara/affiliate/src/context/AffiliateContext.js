'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  affiliateApi,
  clearAffiliateToken,
  getAffiliateToken,
} from '../services/affiliateApi';

/**
 * The portal session.
 *
 * Two things live here that used to have no home:
 *
 * 1. The affiliate's identity — code, name, commission terms, tracking base
 *    URL. Before this, nine components each hardcoded a partner code and eight
 *    hardcoded a site URL, so every one of them was wrong for every real user.
 *
 * 2. The dashboard date range. It used to be local state inside the header,
 *    which meant changing it re-rendered the picker and nothing else. Lifting
 *    it here is what makes the control actually filter the pages below it.
 */

const AffiliateContext = createContext(null);

const PRESETS = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
];

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AffiliateProvider({ children }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unread, setUnread] = useState(0);
  const [range, setRange] = useState({
    preset: '30d',
    from: isoDaysAgo(30),
    to: todayIso(),
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const identity = await affiliateApi('/api/v1/affiliate/me');
      setMe(identity);
      // An approved partner who has not finished onboarding can reach /me but
      // nothing else, so send them where they can actually make progress.
      if (identity && identity.onboarding_complete === false) {
        router.replace('/onboarding');
      }
      return identity;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await affiliateApi(
        '/api/v1/affiliate/notifications?unreadOnly=1&limit=1',
      );
      setUnread(res.unread ?? 0);
    } catch {
      // A failed badge count is not worth surfacing to the user.
    }
  }, []);

  useEffect(() => {
    if (!getAffiliateToken()) {
      setLoading(false);
      return;
    }
    refresh();
    refreshUnread();
  }, [refresh, refreshUnread]);

  const logout = useCallback(() => {
    clearAffiliateToken();
    router.push('/login');
  }, [router]);

  const applyPreset = useCallback((key) => {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setRange({ preset: key, from: isoDaysAgo(preset.days), to: todayIso() });
  }, []);

  const setCustomRange = useCallback((from, to) => {
    setRange({ preset: 'custom', from, to });
  }, []);

  const value = useMemo(
    () => ({
      me,
      loading,
      error,
      refresh,
      logout,
      unread,
      refreshUnread,
      range,
      presets: PRESETS,
      applyPreset,
      setCustomRange,
      // Convenience for the many screens that append the range to a query.
      rangeQuery: `from=${range.from}&to=${range.to}`,
      trackingUrlFor: (code) =>
        `${me?.tracking_base_url ?? ''}${code ?? me?.code ?? ''}`,
    }),
    [me, loading, error, refresh, logout, unread, refreshUnread, range,
     applyPreset, setCustomRange],
  );

  return (
    <AffiliateContext.Provider value={value}>
      {children}
    </AffiliateContext.Provider>
  );
}

export function useAffiliate() {
  const ctx = useContext(AffiliateContext);
  if (!ctx) {
    throw new Error('useAffiliate must be used inside <AffiliateProvider>');
  }
  return ctx;
}
