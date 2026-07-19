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
  theme3: {
    page: 'mx-auto max-w-lg px-4 py-8',
    card: 'rounded-2xl border border-black/[0.06] bg-white p-8 text-center shadow-[0_20px_50px_-32px_rgba(36,27,58,0.45)]',
    panel: 'mt-6 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_20px_50px_-32px_rgba(36,27,58,0.45)]',
    title: 'mt-4 font-display text-2xl font-black text-[#1b1726]',
    meta: 'text-[#6b6579]',
    fair: 'mt-2 text-sm text-[#1c8a52]',
    label: 'text-sm text-[#6b6579]',
    input: 'mt-2 w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-xl text-[#1b1726] outline-none focus:border-[#c79a3b]/70',
    limits: 'mt-2 text-xs text-[#9a94a8]',
    btn: 'mt-4 w-full rounded-lg bg-gradient-to-br from-[#e9c56b] to-[#b8862f] py-3 font-black text-[#241b0e] disabled:opacity-50',
    btnLink: 'mt-4 block w-full rounded-lg bg-gradient-to-br from-[#e9c56b] to-[#b8862f] py-3 text-center font-black text-[#241b0e]',
    error: 'mt-4 text-center text-sm text-[#e5484d]',
    msg: 'mt-4 text-center text-sm text-[#9a7a24]',
    link: 'text-[#c79a3b]',
    iframeBar: 'flex items-center justify-between border-b border-black/[0.06] bg-white px-4 py-2',
    iframeTitle: 'text-sm font-semibold text-[#1b1726]',
    exitBtn: 'rounded-lg border border-black/10 px-3 py-1 text-xs text-[#4a4458] hover:border-[#c79a3b]/50',
    iframe: 'h-[calc(100vh-8rem)] w-full border-0 lg:h-[calc(100vh-5rem)]',
    loading: 'mx-auto max-w-lg px-4 py-12 text-center text-[#6b6579]',
  },
  theme4: {
    page: 'mx-auto max-w-lg px-4 py-8',
    card: 'rounded border border-black/[0.07] bg-white p-8 text-center shadow-sm',
    panel: 'mt-6 rounded border border-black/[0.07] bg-white p-6 shadow-sm',
    title: 'mt-4 font-display text-2xl font-black text-[#13272b]',
    meta: 'text-[#5d7378]',
    fair: 'mt-2 text-sm text-[#1c8a52]',
    label: 'text-sm text-[#5d7378]',
    input: 'mt-2 w-full rounded border border-[#0e7480]/25 bg-white px-4 py-3 text-xl text-[#13272b] outline-none focus:border-[#0e7480]',
    limits: 'mt-2 text-xs text-[#8aa0a4]',
    btn: 'mt-4 w-full rounded bg-gradient-to-b from-[#17a2b0] to-[#0e7480] py-3 font-black uppercase tracking-wide text-white disabled:opacity-50',
    btnLink: 'mt-4 block w-full rounded bg-gradient-to-b from-[#17a2b0] to-[#0e7480] py-3 text-center font-black uppercase tracking-wide text-white',
    error: 'mt-4 text-center text-sm text-[#e5342c]',
    msg: 'mt-4 text-center text-sm text-[#0e7480]',
    link: 'text-[#0e7480]',
    iframeBar: 'flex items-center justify-between border-b border-black/[0.06] bg-white px-4 py-2',
    iframeTitle: 'text-sm font-semibold text-[#13272b]',
    exitBtn: 'rounded border border-[#0e7480]/30 px-3 py-1 text-xs text-[#13272b] hover:border-[#0e7480]',
    iframe: 'h-[calc(100vh-8rem)] w-full border-0 lg:h-[calc(100vh-5rem)]',
    loading: 'mx-auto max-w-lg px-4 py-12 text-center text-[#5d7378]',
  },
  theme5: {
    page: 'mx-auto max-w-lg px-4 py-8',
    card: 'rounded-xl border border-black/[0.06] bg-white p-8 text-center shadow-sm',
    panel: 'mt-6 rounded-xl border border-black/[0.06] bg-white p-6 shadow-sm',
    title: 'mt-4 font-display text-2xl font-black text-[#0f1b33]',
    meta: 'text-[#64748b]',
    fair: 'mt-2 text-sm text-[#15803d]',
    label: 'text-sm text-[#64748b]',
    input: 'mt-2 w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-xl text-[#0f1b33] outline-none focus:border-[#1d4ed8]',
    limits: 'mt-2 text-xs text-[#94a3b8]',
    btn: 'mt-4 w-full rounded-lg bg-[#101c33] py-3 font-black uppercase tracking-wide text-white transition hover:bg-[#1b2a48] disabled:opacity-50',
    btnLink: 'mt-4 block w-full rounded-lg bg-[#101c33] py-3 text-center font-black uppercase tracking-wide text-white transition hover:bg-[#1b2a48]',
    error: 'mt-4 text-center text-sm text-[#f4547a]',
    msg: 'mt-4 text-center text-sm text-[#1d4ed8]',
    link: 'text-[#1d4ed8]',
    iframeBar: 'flex items-center justify-between border-b border-black/[0.06] bg-white px-4 py-2',
    iframeTitle: 'text-sm font-semibold text-[#0f1b33]',
    exitBtn: 'rounded-lg border border-black/10 px-3 py-1 text-xs text-[#0f1b33] hover:border-[#1d4ed8]',
    iframe: 'h-[calc(100vh-8rem)] w-full border-0 lg:h-[calc(100vh-5rem)]',
    loading: 'mx-auto max-w-lg px-4 py-12 text-center text-[#64748b]',
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
