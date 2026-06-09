'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T2Card, t2Input, t2BtnPrimary } from '../components/ui';

export default function Theme2Play() {
  const { slug } = useParams();
  const router = useRouter();
  const { token, refreshSession } = useAuthStore();
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
    if (!token) { router.push('/login'); return; }
    setLoading(true); setMessage('');
    try {
      const res = await api('/api/v1/games/bet', { method: 'POST', body: JSON.stringify({ gameId: game.id, amount: parseFloat(betAmount) }) });
      await refreshSession();
      setMessage(`Bet placed · ${res.betId} · ${res.status}`);
    } catch (e) {
      setMessage(e.message ?? 'Bet failed');
    } finally { setLoading(false); }
  };

  if (!game) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-slate-400">
        Game not found. <Link href="/" className="text-amber-400">Go home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <T2Card className="p-8 text-center">
        <div className="text-6xl">{game.category === 'ai_games' ? '🤖' : '🎮'}</div>
        <h1 className="mt-4 font-display text-2xl font-black text-white">{game.name}</h1>
        {game.provider_name && <p className="text-slate-400">{game.provider_name}</p>}
        {game.is_provably_fair ? <p className="mt-2 text-sm text-emerald-400">Provably Fair</p> : null}
      </T2Card>

      <T2Card className="mt-6 p-6">
        <label className="text-sm text-slate-400">Bet amount (₹)</label>
        <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className={`${t2Input} mt-2 text-xl`} />
        <p className="mt-2 text-xs text-slate-500">Min ₹{game.min_bet} · Max ₹{game.max_bet}</p>
        {token ? (
          <button type="button" disabled={loading} onClick={placeBet} className={`${t2BtnPrimary} mt-4 w-full`}>
            {loading ? 'Placing bet...' : 'Place bet'}
          </button>
        ) : (
          <Link href="/login" className={`${t2BtnPrimary} mt-4 block w-full text-center`}>Login to play</Link>
        )}
        {message ? <p className="mt-4 text-center text-sm text-amber-300">{message}</p> : null}
      </T2Card>
    </div>
  );
}
