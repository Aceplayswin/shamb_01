'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';

// Theme1 game player.
//
// Aggregator games (those carrying a `game_uid`) launch via POST /games/launch:
// the backend asks the external aggregator for a one-time launch URL, opens a
// session, and we render that URL in an iframe. Games without a `game_uid` fall
// back to the legacy internal bet flow so older catalog rows still work.
export default function Theme1Play() {
  const { slug } = useParams();
  const router = useRouter();
  const { token, refreshSession } = useAuthStore();
  const [game, setGame] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [gameUrl, setGameUrl] = useState('');
  const [error, setError] = useState('');

  // Legacy internal-bet fallback state.
  const [betAmount, setBetAmount] = useState('100');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api(`/api/v1/games?limit=300`)
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

  const launchGame = async () => {
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
        setGameUrl(res.data.game_url);
      } else {
        setError('Could not launch this game. Please try again.');
      }
    } catch (e) {
      setError(e.message ?? 'Could not launch this game.');
    } finally {
      setLaunching(false);
    }
  };

  const placeBet = async () => {
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
  };

  if (notFound) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-12 text-center text-slate-400">
        Game not found. <Link href="/" className="text-brand-400">Go home</Link>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-12 text-center text-slate-400">
        Loading game…
      </main>
    );
  }

  // --- Launched: render the aggregator game in an iframe ---
  if (gameUrl) {
    return (
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <h1 className="text-sm font-semibold text-white">{game.name}</h1>
          <button
            type="button"
            onClick={() => setGameUrl('')}
            className="rounded bg-surface-700 px-3 py-1 text-xs text-slate-300 hover:bg-surface-600"
          >
            Exit game
          </button>
        </div>
        <iframe
          src={gameUrl}
          title={game.name}
          className="h-[80vh] w-full border-0"
          allow="fullscreen; autoplay; payment"
        />
      </main>
    );
  }

  const isAggregatorGame = Boolean(game.game_uid);

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-8">
      <div className="card-glass p-8 text-center">
        <div className="text-6xl">{game.category === 'ai_games' ? '🤖' : '🎮'}</div>
        <h1 className="mt-4 text-2xl font-bold text-white">{game.name}</h1>
        {game.provider_name && <p className="text-slate-400">{game.provider_name}</p>}
        {game.is_provably_fair ? (
          <p className="mt-2 text-sm text-green-400">Provably Fair</p>
        ) : null}
      </div>

      <div className="mt-6 card-glass p-6">
        {isAggregatorGame ? (
          <>
            <p className="text-center text-sm text-slate-400">
              Ready to play? Launch {game.name} now.
            </p>
            {token ? (
              <button
                type="button"
                disabled={launching}
                onClick={launchGame}
                className="mt-4 w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900 disabled:opacity-50"
              >
                {launching ? 'Launching…' : 'Launch game'}
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-4 block w-full rounded-lg bg-brand-500 py-3 text-center font-semibold text-surface-900"
              >
                Login to play
              </Link>
            )}
            {error ? <p className="mt-4 text-center text-sm text-red-400">{error}</p> : null}
          </>
        ) : (
          <>
            <label className="text-sm text-slate-400">Bet amount (₹)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-xl text-white"
            />
            <p className="mt-2 text-xs text-slate-500">
              Min ₹{game.min_bet} · Max ₹{game.max_bet}
            </p>
            {token ? (
              <button
                type="button"
                onClick={placeBet}
                className="mt-4 w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900"
              >
                Place bet
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-4 block w-full rounded-lg bg-brand-500 py-3 text-center font-semibold text-surface-900"
              >
                Login to play
              </Link>
            )}
            {message ? <p className="mt-4 text-center text-sm text-brand-300">{message}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
