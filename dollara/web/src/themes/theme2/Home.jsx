'use client';

import { useState } from 'react';
import {
  ArrowRight, Sparkles, Trophy, Dices, Flame, Cherry, Rocket, ShieldCheck, Zap, Play,
} from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useBranding } from '@/hooks/useBranding';

// Theme 2 — "Midnight" homepage. Distinct from theme1: a full-width centered hero,
// a category strip, and a single responsive grid of game tiles (no carousels).

const CATEGORIES = [
  { label: 'All', Icon: Sparkles },
  { label: 'Sports', Icon: Trophy },
  { label: 'Casino', Icon: Dices },
  { label: 'Slots', Icon: Cherry },
  { label: 'Crash', Icon: Rocket },
  { label: 'Trending', Icon: Flame },
];

const GAMES = [
  { id: 'g1', name: 'Aviator', provider: 'AVIATRIX', cat: 'Crash', tag: 'HOT' },
  { id: 'g2', name: 'Crazy Time', provider: 'SMARTSOFT', cat: 'Casino', tag: 'HOT' },
  { id: 'g3', name: 'Lucky Sports', provider: 'MAC88', cat: 'Sports', tag: 'LIVE' },
  { id: 'g4', name: 'Mines', provider: 'GALAXSYS', cat: 'Crash' },
  { id: 'g5', name: 'Monopoly Live', provider: 'AURA GAMING', cat: 'Casino' },
  { id: 'g6', name: 'Forest Arrow', provider: 'TURBOGAMES', cat: 'Slots' },
  { id: 'g7', name: 'Fan Tan', provider: 'ODIN', cat: 'Casino' },
  { id: 'g8', name: 'E-Sports', provider: 'VELIPLAY', cat: 'Sports', tag: 'LIVE' },
  { id: 'g9', name: 'WCC Live', provider: 'PGGAMING', cat: 'Slots' },
  { id: 'g10', name: 'Super Andar Bahar', provider: 'LOTTO', cat: 'Casino' },
  { id: 'g11', name: 'Cash Multiplier', provider: '2J', cat: 'Slots' },
  { id: 'g12', name: 'Go Rush', provider: '2J', cat: 'Crash' },
];

const STATS = [
  { value: '₹8.4Cr', label: 'Paid this week' },
  { value: '2,000+', label: 'Live games' },
  { value: '1.2M+', label: 'Players' },
  { value: '<5 min', label: 'Avg. payout' },
];

function play(game) {
  Swal.fire({
    title: 'Ready to play?',
    html: `<p style="margin:0;color:rgb(var(--color-muted))">Launching <b style="color:rgb(var(--color-app-fg))">${game.name}</b> by ${game.provider}</p>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#F5C542',
    cancelButtonColor: '#1E252E',
    confirmButtonText: 'Play now',
    cancelButtonText: 'Cancel',
  });
}

function Tile({ game }) {
  return (
    <button
      onClick={() => play(game)}
      className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl border border-hairline/[0.07] bg-panel p-4 text-left transition hover:-translate-y-1 hover:border-brand-400/40"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/15 via-surface-800 to-surface-950" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-500/15 blur-2xl" />
      {game.tag && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-surface-950/70 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-brand-300 backdrop-blur">
          <span className={`h-1.5 w-1.5 rounded-full bg-brand-400 ${game.tag === 'LIVE' ? 'animate-pulse' : ''}`} />
          {game.tag}
        </span>
      )}
      <div className="relative z-10">
        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-brand-300">{game.provider}</p>
        <h3 className="mt-0.5 font-display text-sm font-bold leading-tight text-white">{game.name}</h3>
      </div>
      <span className="absolute inset-0 z-20 flex items-center justify-center bg-surface-950/55 opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-500 shadow-glow">
          <Play className="h-5 w-5 fill-surface-950 text-surface-950" />
        </span>
      </span>
    </button>
  );
}

export default function Home() {
  const branding = useBranding();
  const [active, setActive] = useState('All');

  const games = active === 'All' ? GAMES : GAMES.filter((g) => g.cat === active);

  return (
    <main>
      {/* Full-width hero */}
      <section className="relative overflow-hidden border-b border-hairline/[0.08] bg-mesh-amber">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center xl:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-300">
            <Sparkles className="h-3.5 w-3.5" /> Welcome offer
          </span>
          <h1 className="mt-5 font-display text-5xl font-black leading-[0.95] text-app-fg sm:text-7xl">
            Bet bigger on <span className="text-gradient-gold">{branding.product_name || 'Midnight'}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted">
            Claim up to <span className="font-bold text-brand-300">₹5,000</span> in instant bonus credits.
            Sign up in seconds — no wagering tricks, instant withdrawals.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-3.5 text-sm font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500"
            >
              Claim ₹5,000 <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-hairline/15 px-6 py-3.5 text-sm font-bold text-app-fg transition hover:bg-hairline/[0.06]"
            >
              <Zap className="h-4 w-4 text-brand-400" /> I have an account
            </a>
          </div>
        </div>

        {/* Stat strip */}
        <div className="relative mx-auto grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-t-2xl border border-b-0 border-hairline/[0.08] bg-hairline/[0.06] sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-panel-strong/80 px-4 py-5 text-center">
              <p className="font-display text-2xl font-black text-app-fg">{s.value}</p>
              <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted/80">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-10 xl:px-8">
        {/* Category strip */}
        <div className="mb-8 flex flex-wrap gap-2.5">
          {CATEGORIES.map(({ label, Icon }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition ${
                active === label
                  ? 'border-brand-400 bg-gradient-to-r from-brand-400 to-brand-600 text-surface-950 shadow-glow'
                  : 'border-hairline/10 bg-panel/60 text-app-fg/70 hover:border-hairline/20 hover:text-app-fg'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Games grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-app-fg">
            {active === 'All' ? 'All Games' : active} <span className="text-muted/70">({games.length})</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {games.map((game) => (
            <Tile key={game.id} game={game} />
          ))}
        </div>

        {/* Trust band */}
        <section className="mt-14 grid grid-cols-1 gap-4 rounded-3xl border border-hairline/[0.07] bg-panel-strong/60 p-8 sm:grid-cols-3">
          {[
            { title: 'Instant payouts', desc: 'Cash out to UPI in under 5 minutes', Icon: Zap },
            { title: 'Provably fair', desc: 'Certified RNG and published RTP', Icon: ShieldCheck },
            { title: '24/7 support', desc: 'Real humans, any time of day', Icon: Trophy },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 text-brand-400 ring-1 ring-white/10">
                <f.Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-app-fg">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
