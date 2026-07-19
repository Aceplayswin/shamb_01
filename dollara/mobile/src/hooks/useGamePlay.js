import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { loadGameCatalog } from './useGameCatalog';
import { useAuthStore } from '../store/auth';

// Play a game.
//
// Web redirects the whole tab to the aggregator's URL. Mobile has no tab to give
// away, so instead we surface `gameUrl` and let the Play screen host it in a
// full-screen in-app browser. Either way bets and wins are settled server-side
// via the aggregator callback webhook — the client only opens the session.
export function useGamePlay(slug, { onRequireLogin } = {}) {
  const token = useAuthStore((s) => s.token);
  const refreshSession = useAuthStore((s) => s.refreshSession);

  const [game, setGame] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [gameUrl, setGameUrl] = useState(null);
  const [error, setError] = useState('');
  const [betAmount, setBetAmount] = useState('100');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setGame(null);
    setNotFound(false);
    setGameUrl(null);
    setError('');
    loadGameCatalog(300)
      .then((games) => {
        if (!active) return;
        const g = games.find((x) => x.slug === slug);
        if (!g) {
          setNotFound(true);
          return;
        }
        setGame(g);
        if (g.min_bet) setBetAmount(String(g.min_bet));
      })
      .catch(() => active && setNotFound(true));
    return () => {
      active = false;
    };
  }, [slug]);

  const launchGame = useCallback(async () => {
    if (!game) return;
    if (!token) {
      onRequireLogin?.();
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
        setGameUrl(res.data.game_url);
        return;
      }
      setError(res.error ?? 'Could not launch this game. Please try again.');
    } catch (e) {
      setError(e.message ?? 'Could not launch this game.');
    } finally {
      setLaunching(false);
    }
  }, [game, token, onRequireLogin]);

  const placeBet = useCallback(async () => {
    if (!game) return;
    if (!token) {
      onRequireLogin?.();
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
  }, [game, token, betAmount, refreshSession, onRequireLogin]);

  // Closing the game view settles nothing client-side, but the wallet will have
  // moved while the player was in the session — pull the new balance.
  const closeGame = useCallback(() => {
    setGameUrl(null);
    refreshSession();
  }, [refreshSession]);

  const isAggregatorGame = Boolean(game?.game_uid);
  const autoLaunchDone = useRef(false);

  // Auto-launch once when an aggregator game loads and the player is signed in.
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
    gameUrl,
    error,
    betAmount,
    setBetAmount,
    message,
    launchGame,
    placeBet,
    closeGame,
    isAggregatorGame,
    token,
  };
}
