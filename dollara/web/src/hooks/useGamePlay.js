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
    loadGameCatalog(300)
      .then((games) => {
        const g = games.find((x) => x.slug === slug);
        if (!g) {
          setNotFound(true);
          return;
        }
        setGame(g);
        if (g.min_bet) setBetAmount(String(g.min_bet));
      })
      .catch(() => setNotFound(true));
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
        window.location.href = res.data.game_url;
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
  const autoLaunchDone = useRef(false);

  // Auto-launch once when an aggregator game loads and the user is logged in.
  useEffect(() => {
    if (autoLaunchDone.current) return;
    if (!game || !isAggregatorGame || !token) return;
    autoLaunchDone.current = true;
    launchGame();
  }, [game, isAggregatorGame, token, launchGame]);

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
