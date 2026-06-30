'use client';

import Link from 'next/link';
import { useGamePlay } from '@/hooks/useGamePlay';

const STYLES = {
  theme1: {
    page: 'mx-auto max-w-lg flex-1 px-4 py-8',
    card: 'card-glass p-8 text-center',
    panel: 'mt-6 card-glass p-6',
    title: 'mt-4 text-2xl font-bold text-white',
    meta: 'text-slate-400',
    fair: 'mt-2 text-sm text-green-400',
    label: 'text-sm text-slate-400',
    input: 'mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-xl text-white',
    limits: 'mt-2 text-xs text-slate-500',
    btn: 'mt-4 w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900 disabled:opacity-50',
    btnLink: 'mt-4 block w-full rounded-lg bg-brand-500 py-3 text-center font-semibold text-surface-900',
    error: 'mt-4 text-center text-sm text-red-400',
    msg: 'mt-4 text-center text-sm text-brand-300',
    link: 'text-brand-400',
    loading: 'mx-auto max-w-lg flex-1 px-4 py-12 text-center text-slate-400',
  },
  theme2: {
    page: 'mx-auto max-w-lg px-4 py-8',
    card: 'rounded-2xl border border-white/5 bg-[#0d1420] p-8 text-center',
    panel: 'mt-6 rounded-2xl border border-white/5 bg-[#0d1420] p-6',
    title: 'mt-4 font-display text-2xl font-black text-white',
    meta: 'text-slate-400',
    fair: 'mt-2 text-sm text-emerald-400',
    label: 'text-sm text-slate-400',
    input: 'mt-2 w-full rounded-lg border border-white/10 bg-[#0a101a] px-4 py-3 text-xl text-white outline-none focus:border-amber-400/50',
    limits: 'mt-2 text-xs text-slate-500',
    btn: 'mt-4 w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-3 font-bold text-black disabled:opacity-50',
    btnLink: 'mt-4 block w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-3 text-center font-bold text-black',
    error: 'mt-4 text-center text-sm text-rose-400',
    msg: 'mt-4 text-center text-sm text-amber-300',
    link: 'text-amber-400',
    loading: 'mx-auto max-w-lg px-4 py-12 text-center text-slate-400',
  },
};

export function GamePlayView({ slug, variant = 'theme1' }) {
  const s = STYLES[variant] ?? STYLES.theme1;
  const {
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
  } = useGamePlay(slug);

  if (notFound) {
    return (
      <main className={s.loading}>
        Game not found. <Link href="/" className={s.link}>Go home</Link>
      </main>
    );
  }

  if (!game) {
    return (
      <main className={s.loading}>
        {launching ? 'Launching game…' : 'Loading game…'}
      </main>
    );
  }

  // Aggregator games redirect the whole tab to the provider's URL (full screen,
  // no Dollara chrome). While that navigation kicks in, show a minimal notice
  // with a manual retry in case the browser blocked the redirect.
  if (redirecting) {
    return (
      <main className={s.loading}>
        Opening {game.name}…{' '}
        <button type="button" onClick={launchGame} className={s.link}>
          Tap to retry
        </button>
      </main>
    );
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className="text-6xl">{game.category === 'ai_games' ? '🤖' : '🎮'}</div>
        <h1 className={s.title}>{game.name}</h1>
        {game.provider_name && <p className={s.meta}>{game.provider_name}</p>}
        {game.is_provably_fair ? <p className={s.fair}>Provably Fair</p> : null}
      </div>

      <div className={s.panel}>
        {isAggregatorGame ? (
          <>
            <p className="text-center text-sm text-slate-400">
              {launching
                ? `Starting ${game.name}…`
                : error
                  ? 'Could not auto-launch. Tap below to retry.'
                  : `Ready to play? Launch ${game.name} now.`}
            </p>
            {token ? (
              <button type="button" disabled={launching} onClick={launchGame} className={s.btn}>
                {launching ? 'Launching…' : error ? 'Retry launch' : 'Launch game'}
              </button>
            ) : (
              <Link href="/login" className={s.btnLink}>
                Login to play
              </Link>
            )}
            {error ? <p className={s.error}>{error}</p> : null}
          </>
        ) : (
          <>
            <label className={s.label}>Bet amount (₹)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className={s.input}
            />
            <p className={s.limits}>
              Min ₹{game.min_bet} · Max ₹{game.max_bet}
            </p>
            {token ? (
              <button type="button" onClick={placeBet} className={s.btn}>
                Place bet
              </button>
            ) : (
              <Link href="/login" className={s.btnLink}>
                Login to play
              </Link>
            )}
            {message ? <p className={s.msg}>{message}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
