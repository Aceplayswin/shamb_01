'use client';

// Keeps the signed-in player's wallet in step with the server.
//
// Balances move from OUTSIDE this app: an aggregator settles a round and
// credits the win through the callback webhook, and an admin approves a
// deposit or withdrawal in the console. Nothing in the browser knows any of
// that happened, and the store only refreshed when a page mounted — so a win
// could sit invisible until the player navigated somewhere, which reads as
// "winning amount added to the wallet very late".
//
// Polling on an interval is the simple fix that needs no socket: the ticker is
// paused while the tab is hidden (a backgrounded tab must not keep hitting the
// API) and fires once immediately on becoming visible again, which is exactly
// when a player returning from a game wants to see their new balance.

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

const POLL_MS = 15000;

export function useWalletSync(intervalMs = POLL_MS) {
  const token = useAuthStore((s) => s.token);
  const refreshSession = useAuthStore((s) => s.refreshSession);

  useEffect(() => {
    if (!token) return undefined;

    const isHidden = () => typeof document !== 'undefined' && document.hidden;

    const tick = () => {
      if (!isHidden()) refreshSession();
    };

    // Coming back to the tab — from a game, a payment app — refresh at once
    // rather than waiting out the rest of the interval.
    const onVisible = () => {
      if (!isHidden()) refreshSession();
    };

    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, refreshSession, intervalMs]);
}
