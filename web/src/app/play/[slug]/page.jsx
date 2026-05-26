'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';

export default function PlayPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();
  const [game, setGame] = useState(null);
  const [betAmount, setBetAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api(`/api/v1/games?limit=100`)
      .then((games) => {
        const g = games.find((x) => x.slug === slug);
        setGame(g ?? null);
        if (g?.min_bet) setBetAmount(String(g.min_bet));
      })
      .catch(() => setGame(null));
  }, [slug]);

  const placeBet = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  if (!game) {
    return (
      <>
        <Header wallet={wallet ?? undefined} />
        <main className="mx-auto max-w-lg flex-1 px-4 py-12 text-center text-slate-400">
          Game not found. <Link href="/" className="text-brand-400">Go home</Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header wallet={wallet ?? undefined} />
      <main className="mx-auto max-w-lg flex-1 px-4 py-8">
        <div className="card-glass p-8 text-center">
          <div className="text-6xl">{game.category === 'ai_games' ? '🤖' : '🎮'}</div>
          <h1 className="mt-4 text-2xl font-bold text-white">{game.name}</h1>
          <p className="text-slate-400">{game.provider_name ?? 'DOLLARA'}</p>
          {game.is_provably_fair ? (
            <p className="mt-2 text-sm text-green-400">Provably Fair</p>
          ) : null}
        </div>

        <div className="mt-6 card-glass p-6">
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
              disabled={loading}
              onClick={placeBet}
              className="mt-4 w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900 disabled:opacity-50"
            >
              {loading ? 'Placing bet...' : 'Place bet'}
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
        </div>
      </main>
      <Footer />
    </>
  );
}
