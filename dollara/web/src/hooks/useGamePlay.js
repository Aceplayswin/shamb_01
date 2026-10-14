'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { loadGameCatalog } from '@/hooks/useGameCatalog';
import { useAuthStore } from '@/store/auth';

export function useGamePlay(slug) {
  const router = useRouter();
  const { token, refreshSession } = useAuthStore();
  const [game, setGame] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');
  const [betAmount, setBetAmount] = useState('100');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setGame(null);
    setNotFound(false);
    setRedirecting(false);
    setError('');
    if (!slug) {
      setNotFound(true);
      return undefined;
    }
    let active = true;

    const apply = (g) => {
      if (!active) return;
      setGame(g);
      if (g.min_bet) setBetAmount(String(g.min_bet));
    };

    // Resolve the game server-side. Scanning the downloaded catalog instead
    // made every game past its page limit unopenable ("Game not found"), since
    // the catalog is capped well below the number of games on the platform.
    api(`/api/v1/games/detail/${encodeURIComponent(slug)}`)
      .then(apply)
      .catch(() =>
        // Older API without the detail route: fall back to the catalog scan so
        // the page still works for games inside the first page.
        loadGameCatalog(1000)
          .then((games) => {
            const g = games.find((x) => x.slug === slug);
            if (!active) return;
            if (g) apply(g);
            else setNotFound(true);
          })
          .catch(() => active && setNotFound(true)),
      );

    return () => {
      active = false;
    };
  }, [slug]);

  const launchGame = useCallback(async () => {
    if (!game) return;
    if (!token) {
      router.push('/login');
      return;
    }
    setLaunching(true);
    setError('');
    try {
      const res = await api('/api/v1/games/launch', {
        method: 'POST',
        body: JSON.stringify({ gameUid: game.game_uid, gameName: game.name }),
      });
      if (res.status_code === 'success' && res.data?.game_url) {
        // Full-page redirect to the aggregator's original game URL. The game
        // takes over the whole tab on its own domain — no Dollara chrome. Bets
        // and wins are settled server-side via the aggregator callback webhook
        // (process_callback → GameRound/Wallet/GameSession), and the game's
        // home button returns the player here (home_url sent at launch).
        setRedirecting(true);
        // Replace this entry in history instead of pushing onto it. The game
        // takes over the tab, so leaving /play/<slug> in the stack meant the
        // browser's Back (and the game's own home button) returned here and the
        // auto-launch effect immediately threw the player back into the game —
        // "back doesn't leave the game". Replacing sends Back to whatever page
        // the player opened the game from.
        window.location.replace(res.data.game_url);
        return;
      }
      setError(res.error ?? 'Could not launch this game. Please try again.');
    } catch (e) {
      setError(e.message ?? 'Could not launch this game.');
    } finally {
      setLaunching(false);
    }
  }, [game, token, router]);

  const placeBet = useCallback(async () => {
    if (!game) return;
    if (!token) {
      router.push('/login');
      return;
    }
    setMessage('');
    try {
      const res = await api('/api/v1/games/bet', {
        method: 'POST',
        body: JSON.stringify({ gameId: game.id, amount: parseFloat(betAmount) }),
      });
      await refreshSession();
      setMessage(`Bet placed · ${res.betId} · ${res.status}`);
    } catch (e) {
      setMessage(e.message ?? 'Bet failed');
    }
  }, [game, token, betAmount, refreshSession, router]);

  const isAggregatorGame = Boolean(game?.game_uid);
  // Which slug has already auto-launched. A plain `true` flag never reset, so
  // opening a second game in the same session (very common: back out, tap
  // another) silently skipped its auto-launch and sat on the manual screen.
  const autoLaunchedSlug = useRef(null);

  // Auto-launch once per game when it loads and the user is logged in.
  useEffect(() => {
    if (!game || !isAggregatorGame || !token) return;
    if (autoLaunchedSlug.current === slug) return;
    autoLaunchedSlug.current = slug;
    launchGame();
  }, [game, isAggregatorGame, token, launchGame, slug]);

  return {
    game,
    notFound,
    launching,
    redirecting,
    error,
    betAmount,
    setBetAmount,
    message,
    launchGame,
    placeBet,
    isAggregatorGame,
    token,
  };
}
