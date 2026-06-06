'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useBranding } from '@/hooks/useBranding';
import {
  Play,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Flame,
  Trophy,
  Dices,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const PROVIDERS = ['MAC88', '18PEACHES', 'VELIPLAY', 'AVIATRIX', 'INOUT', 'GALAXSYS', 'SMARTSOFT', '2J', 'TURBOGAMES WORLD', 'AURA GAMING', 'LOTTO', 'PGGAMING', 'ODIN COCKFIGHTING'];

const LIVE_SPORTS = [
  { id: 's1', name: 'Lucky Sports', provider: 'MAC88', tag: 'LIVE' },
  { id: 's2', name: 'E-Sports', provider: 'VELIPLAY', tag: 'LIVE' },
  { id: 's3', name: 'Football', provider: '18PEACHES', tag: 'LIVE' },
];

const CASINO_GAMES = [
  { id: 'c1', name: 'Microgaming', provider: 'MAC88' },
  { id: 'c2', name: 'Aviator', provider: 'AVIATRIX', tag: 'HOT' },
  { id: 'c3', name: 'Live Dealer', provider: 'INOUT' },
  { id: 'c4', name: 'Mines', provider: 'GALAXSYS' },
  { id: 'c5', name: 'Crazy Time', provider: 'SMARTSOFT', tag: 'HOT' },
  { id: 'c6', name: 'Go Rush', provider: '2J' },
];

const TRENDING_GAMES = [
  { id: 't1', name: 'Crazy Time', provider: 'SMARTSOFT' },
  { id: 't2', name: 'Forest Arrow', provider: 'TURBOGAMES WORLD' },
  { id: 't3', name: 'Monopoly Live', provider: 'AURA GAMING' },
  { id: 't4', name: 'Super Andar Bahar', provider: 'LOTTO' },
  { id: 't5', name: 'Crazy Pachinko', provider: 'PGGAMING' },
  { id: 't6', name: 'Fan Tan', provider: 'ODIN COCKFIGHTING' },
];

const TRENDING_SLOTS = [
  { id: 'sl1', name: 'Cockfighting', provider: 'ODIN COCKFIGHTING' },
  { id: 'sl2', name: 'WCC Live', provider: 'PGGAMING' },
  { id: 'sl3', name: 'WGC', provider: 'LOTTO' },
  { id: 'sl4', name: 'Admiral Wild', provider: 'AURA GAMING' },
  { id: 'sl5', name: 'Brazilian Mask', provider: 'TURBOGAMES WORLD' },
  { id: 'sl6', name: 'Cash Multiplier', provider: '2J' },
];

const ALL_GAMES = [...LIVE_SPORTS, ...CASINO_GAMES, ...TRENDING_GAMES, ...TRENDING_SLOTS];

const PARTNERS = ['Caleta', 'CQ9', 'Endorphina', 'Evolution', 'Evoplay', 'PG Soft', 'Pragmatic', 'Saba Sports'];

// Per-section theming so the page reads as designed rather than a stock template.
const THEMES = {
  sports: { ring: 'from-emerald-400/40', glow: 'shadow-[0_18px_50px_-22px_rgba(16,210,122,0.7)]', dot: 'bg-emerald-400', chip: 'text-emerald-300' },
  casino: { ring: 'from-brand-400/40', glow: 'shadow-[0_18px_50px_-22px_rgba(255,152,0,0.7)]', dot: 'bg-brand-400', chip: 'text-brand-300' },
  trending: { ring: 'from-rose-400/40', glow: 'shadow-[0_18px_50px_-22px_rgba(244,63,94,0.7)]', dot: 'bg-rose-400', chip: 'text-rose-300' },
  slots: { ring: 'from-accent-400/40', glow: 'shadow-[0_18px_50px_-22px_rgba(124,77,255,0.7)]', dot: 'bg-accent-400', chip: 'text-accent-300' },
};

const ACCENT_TEXT = {
  brand: 'text-brand-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
  accent: 'text-accent-400',
};

function SectionHeader({ title, kicker, Icon, onSeeAll, accent = 'brand' }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl border border-hairline/10 bg-panel ${ACCENT_TEXT[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          {kicker && (
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-muted/80">{kicker}</p>
          )}
          <h2 className="font-display text-xl font-bold text-app-fg">{title}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="grid h-8 w-8 place-items-center rounded-lg border border-hairline/10 text-muted transition hover:bg-panel hover:text-app-fg">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="grid h-8 w-8 place-items-center rounded-lg border border-hairline/10 text-muted transition hover:bg-panel hover:text-app-fg">
          <ChevronRight className="h-4 w-4" />
        </button>
        {onSeeAll && (
          <button className="ml-1 hidden items-center gap-1 rounded-lg border border-hairline/10 px-3 py-1.5 text-xs font-bold text-app-fg/70 transition hover:border-brand-400/50 hover:text-app-fg sm:flex">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function GameCard({ item, onPlay, theme = THEMES.casino, rank }) {
  return (
    <button
      onClick={() => onPlay(item)}
      className={`group relative flex aspect-[3/4] w-44 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl border border-hairline/[0.07] bg-panel text-left transition-all duration-300 hover:-translate-y-1 hover:border-hairline/20 ${theme.glow} sm:w-48`}
    >
      {/* Art placeholder — themed gradient mesh (kept on the fixed dark scale for contrast against any theme) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.ring} via-surface-800 to-surface-950`} />
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.04] blur-2xl transition group-hover:bg-white/[0.08]" />

      {/* Top badges */}
      <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
        {item.tag ? (
          <span className={`flex items-center gap-1 rounded-full bg-surface-950/70 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider backdrop-blur ${theme.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot} ${item.tag === 'LIVE' ? 'animate-pulse' : ''}`} />
            {item.tag}
          </span>
        ) : (
          <span />
        )}
        {rank && (
          <span className="font-display text-2xl font-black text-white/15">{rank}</span>
        )}
      </div>

      {/* Title block */}
      <div className="relative z-10 p-3.5">
        <p className={`text-[0.6rem] font-bold uppercase tracking-widest ${theme.chip}`}>{item.provider}</p>
        <h3 className="mt-0.5 font-display text-base font-bold leading-tight text-white">{item.name}</h3>
      </div>

      {/* Hover play overlay — sits over the art placeholder, stays on the fixed dark scale */}
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-950/55 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 shadow-glow transition-transform duration-300 group-hover:scale-100">
          <Play className="h-6 w-6 fill-surface-950 text-surface-950" />
        </span>
      </div>
    </button>
  );
}

function Carousel({ items, onPlay, theme, ranked }) {
  return (
    <div className="edge-fade-x flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((item, i) => (
        <GameCard key={item.id} item={item} onPlay={onPlay} theme={theme} rank={ranked ? i + 1 : undefined} />
      ))}
    </div>
  );
}

function Accordion({ question, answer, isOpen, onClick }) {
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${isOpen ? 'border-brand-400/40 bg-panel' : 'border-hairline/[0.07] bg-panel/60'}`}>
      <button onClick={onClick} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span className="flex items-center gap-3 font-semibold text-app-fg">
          <span className={`h-2 w-2 rounded-full transition-colors ${isOpen ? 'bg-brand-400' : 'bg-muted/40'}`} />
          {question}
        </span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-hairline/10 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-4 w-4 text-app-fg/70" />
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pl-10 text-sm leading-relaxed text-muted">{answer}</div>
      )}
    </div>
  );
}

export default function HomePage() {
  const branding = useBranding();
  const [openFaq, setOpenFaq] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);

  const handlePlayGame = (game) => {
    Swal.fire({
      title: 'Ready to play?',
      html: `<p style="margin:0;color:rgb(var(--color-muted))">Launching <b style="color:rgb(var(--color-app-fg))">${game.name}</b> by ${game.provider}</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#211d30',
      confirmButtonText: 'Play now',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Loading…',
          text: `${game.name} is starting up.`,
          icon: 'success',
          confirmButtonColor: '#ff9800',
        });
      }
    });
  };

  const filteredGames = ALL_GAMES.filter((game) => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = selectedProvider ? game.provider === selectedProvider : true;
    return matchesSearch && matchesProvider;
  });

  const uniqueFilteredGames = Array.from(new Map(filteredGames.map((item) => [item.id, item])).values());
  const isFiltering = searchQuery !== '' || selectedProvider !== null;

  return (
    <>
      <Header />
      <main>
        <div className="mx-auto max-w-[1400px] space-y-12 px-4 py-6 xl:px-6">
          {!isFiltering && (
            <>
              {/* Bento hero — one feature panel + a stacked side column */}
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Primary welcome panel */}
                <div className="ring-grad relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl bg-panel-strong bg-mesh-amber p-8 sm:p-10 lg:col-span-2">
                  <div className="pointer-events-none absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-300">
                      <Sparkles className="h-3.5 w-3.5" /> Welcome offer
                    </span>
                    <h1 className="mt-5 font-display text-4xl font-black leading-[0.95] text-app-fg sm:text-6xl">
                      Get a <span className="text-gradient-gold">5% boost</span>
                      <br />
                      on your first deposit
                    </h1>
                    <p className="mt-4 max-w-md text-sm text-muted">
                      Sign up in seconds and claim up to{' '}
                      <span className="font-bold text-brand-300">₹5,000</span> in instant bonus credits — no wagering tricks.
                    </p>
                  </div>
                  <div className="relative mt-8 flex flex-wrap items-center gap-3">
                    <a
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-3 text-sm font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500"
                    >
                      Claim ₹5,000 <ArrowRight className="h-4 w-4" />
                    </a>
                    <span className="text-xs font-medium text-muted">⚡ Credited instantly</span>
                  </div>
                </div>

                {/* Side stack */}
                <div className="flex flex-col gap-4">
                  <div className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-3xl border border-hairline/[0.07] bg-panel-strong bg-mesh-violet p-6">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent-500/25 blur-2xl" />
                    <p className="text-xs font-bold uppercase tracking-widest text-accent-300">Deposit bonus</p>
                    <p className="mt-2 font-display text-5xl font-black text-app-fg">
                      ₹100<span className="text-2xl text-accent-300">/-</span>
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">Extra · No wagering</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-hairline/[0.07] bg-panel/70 p-5">
                      <Trophy className="h-5 w-5 text-brand-400" />
                      <p className="mt-3 font-display text-2xl font-black text-app-fg">₹8.4Cr</p>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted/80">Paid this week</p>
                    </div>
                    <div className="rounded-3xl border border-hairline/[0.07] bg-panel/70 p-5">
                      <Dices className="h-5 w-5 text-emerald-400" />
                      <p className="mt-3 font-display text-2xl font-black text-app-fg">2,000+</p>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted/80">Live games</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Ticker */}
              <div className="flex items-center overflow-hidden rounded-2xl border border-hairline/[0.07] bg-panel/60">
                <div className="flex h-11 shrink-0 items-center gap-2 bg-gradient-to-r from-brand-400 to-brand-600 px-4 text-xs font-bold uppercase text-surface-950">
                  <Zap className="h-4 w-4" /> Latest
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <div className="flex w-max animate-marquee whitespace-nowrap text-xs font-semibold tracking-wide text-app-fg/80">
                    {[0, 1].map((dup) => (
                      <span key={dup} className="flex items-center">
                        <span className="px-6">🎰 Live casino games launching in 7 days</span>
                        <span className="px-6">🏆 Mega slots tournament starts in 10 days</span>
                        <span className="px-6">💸 Weekly cashback v2.0 releasing soon</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Search + brand strip */}
          <div className="glass sticky top-[4.5rem] z-20 flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
            <div className="flex items-center gap-3 text-app-fg">
              <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-muted sm:block">
                Premier <span className="text-brand-400">betting</span> experience
              </span>
              <span className="hidden h-4 w-px bg-hairline/15 sm:block" />
              <span className="font-display text-lg font-extrabold italic text-gradient-gold">{branding.product_name}</span>
            </div>
            <div className="relative flex w-full items-center sm:w-80">
              <Search className="absolute left-3.5 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search 2,000+ games…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-hairline/10 bg-rail/60 p-2.5 pl-10 pr-10 text-sm text-app-fg placeholder-muted/70 transition-colors focus:border-brand-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5">
                  <X className="h-4 w-4 text-muted hover:text-app-fg" />
                </button>
              )}
            </div>
          </div>

          {/* Providers */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Game Providers</h3>
              {selectedProvider && (
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <div className="edge-fade-x flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p === selectedProvider ? null : p)}
                  className={`shrink-0 rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    p === selectedProvider
                      ? 'border-brand-400 bg-gradient-to-r from-brand-400 to-brand-600 text-surface-950 shadow-glow'
                      : 'border-hairline/10 bg-panel/60 text-app-fg/70 hover:border-hairline/20 hover:text-app-fg'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {isFiltering ? (
            <section className="min-h-[400px]">
              <h2 className="mb-6 font-display text-xl font-bold text-app-fg">
                Results <span className="text-muted/70">({uniqueFilteredGames.length})</span>
              </h2>
              {uniqueFilteredGames.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {uniqueFilteredGames.map((game) => (
                    <div key={game.id} className="flex justify-center">
                      <GameCard item={game} onPlay={handlePlayGame} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-muted/70">
                  <Search className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p className="text-lg font-bold text-app-fg/70">No games found</p>
                  <p className="mt-2 text-sm">Try a different search or provider filter.</p>
                </div>
              )}
            </section>
          ) : (
            <>
              <section>
                <SectionHeader title="Live Sports" kicker="In play now" Icon={Trophy} accent="emerald" onSeeAll />
                <Carousel items={LIVE_SPORTS} onPlay={handlePlayGame} theme={THEMES.sports} />
              </section>

              <section>
                <SectionHeader title="Casino Lobby" kicker="Top providers" Icon={Dices} accent="brand" onSeeAll />
                <Carousel items={CASINO_GAMES} onPlay={handlePlayGame} theme={THEMES.casino} />
              </section>

              <section>
                <SectionHeader title="Trending Games" kicker="Player favourites" Icon={Flame} accent="rose" onSeeAll />
                <Carousel items={TRENDING_GAMES} onPlay={handlePlayGame} theme={THEMES.trending} ranked />
              </section>

              <section>
                <SectionHeader title="Trending Slots" kicker="Big multipliers" Icon={Sparkles} accent="accent" onSeeAll />
                <Carousel items={TRENDING_SLOTS} onPlay={handlePlayGame} theme={THEMES.slots} ranked />
              </section>

              {/* Why choose — feature row */}
              <section>
                <div className="mb-6">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-muted/80">Why we're different</p>
                  <h2 className="font-display text-2xl font-bold text-app-fg">
                    Built for players who <span className="text-gradient-gold">expect more</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { title: 'Fast Withdrawals', desc: 'Cash out in under 5 minutes', Icon: Clock },
                    { title: 'Instant Deposits', desc: 'UPI, cards & wallets', Icon: CreditCard },
                    { title: '1-Click Signup', desc: 'No paperwork to start', Icon: UserPlus },
                    { title: 'Provably Fair', desc: 'Certified RNG & licensing', Icon: ShieldCheck },
                  ].map((f, i) => (
                    <div
                      key={f.title}
                      className="group relative overflow-hidden rounded-2xl border border-hairline/[0.07] bg-panel/60 p-6 transition hover:-translate-y-1 hover:border-brand-400/40"
                    >
                      <span className="absolute right-4 top-4 font-display text-3xl font-black text-app-fg/[0.06]">0{i + 1}</span>
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 text-brand-400 ring-1 ring-white/10 transition group-hover:text-brand-300">
                        <f.Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-display text-base font-bold text-app-fg">{f.title}</h3>
                      <p className="mt-1 text-xs text-muted">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Partners */}
              <section>
                <p className="mb-6 text-center text-[0.6rem] font-bold uppercase tracking-[0.25em] text-muted/80">
                  Worldwide partnerships
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {PARTNERS.map((partner) => (
                    <div
                      key={partner}
                      className="group flex aspect-[3/2] flex-col items-center justify-center gap-1 rounded-xl border border-hairline/[0.06] bg-panel/40 transition hover:border-hairline/15 hover:bg-panel"
                    >
                      <span className="font-display font-bold text-muted transition group-hover:text-app-fg">{partner}</span>
                      <span className="text-[0.5rem] uppercase tracking-[0.2em] text-muted/50">Official</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section className="mx-auto max-w-3xl py-4">
                <div className="mb-8 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-hairline/10 bg-panel/60 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-accent-300">
                    <Sparkles className="h-3 w-3" /> Knowledge base
                  </span>
                  <h2 className="mt-4 font-display text-3xl font-bold text-app-fg">
                    Frequently asked <span className="text-gradient-gold">questions</span>
                  </h2>
                </div>
                <div className="space-y-3">
                  {[
                    { q: `Why is ${branding.product_name} one of the best betting sites in India?`, a: 'A trusted, licensed platform built around fast payouts, fair games and 24/7 human support — without the clutter of typical betting sites.' },
                    { q: 'Is online betting legal in India?', a: 'There are no federal laws explicitly prohibiting online betting across most of India. We recommend checking your local state regulations.' },
                    { q: 'How do I withdraw my winnings?', a: 'Withdraw instantly to UPI or your bank account. Most cash-outs complete in under five minutes.' },
                    { q: 'Can I actually win in an online casino?', a: 'Yes. Every game uses certified RNG and published RTP so outcomes are genuinely random and verifiable.' },
                    { q: 'Are casino games skill or luck?', a: 'It depends. Slots and crash games are luck-based, while Poker and Blackjack reward skill and strategy.' },
                  ].map((faq, idx) => (
                    <Accordion
                      key={idx}
                      question={faq.q}
                      answer={faq.a}
                      isOpen={openFaq === idx}
                      onClick={() => setOpenFaq(idx === openFaq ? -1 : idx)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
