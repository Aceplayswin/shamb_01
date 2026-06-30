'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBranding } from '@/hooks/useBranding';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useGameSearch } from '@/hooks/useGameSearch';
import {
  filterByCategory,
  filterByProvider,
  filterFeatured,
  NAV_GAME_LINKS,
  playPath,
} from '@/lib/gameRoutes';
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

const PARTNERS = ['Caleta', 'CQ9', 'Endorphina', 'Evolution', 'Evoplay', 'PG Soft', 'Pragmatic', 'Saba Sports'];

// Per-section theming so the page reads as designed rather than a stock template.
const THEMES = {
  sports: { ring: 'from-emerald-400/40', glow: 'shadow-[0_18px_50px_-22px_rgba(0,210,106,0.7)]', dot: 'bg-emerald-400', chip: 'text-emerald-300' },
  casino: { ring: 'from-brand-400/40', glow: 'shadow-[0_18px_50px_-22px_rgba(245,197,66,0.7)]', dot: 'bg-brand-400', chip: 'text-brand-300' },
  trending: { ring: 'from-rose-400/40', glow: 'shadow-[0_18px_50px_-22px_rgba(244,63,94,0.7)]', dot: 'bg-rose-400', chip: 'text-rose-300' },
  slots: { ring: 'from-brand-600/40', glow: 'shadow-[0_18px_50px_-22px_rgba(255,184,0,0.7)]', dot: 'bg-brand-600', chip: 'text-brand-300' },
};

const ACCENT_TEXT = {
  brand: 'text-brand-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
};

function SectionHeader({ title, kicker, Icon, seeAllHref, accent = 'brand', onPrev, onNext }) {
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
        <button
          type="button"
          onClick={onPrev}
          aria-label="Scroll left"
          className="grid h-8 w-8 place-items-center rounded-lg border border-hairline/10 text-muted transition hover:bg-panel hover:text-app-fg"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Scroll right"
          className="grid h-8 w-8 place-items-center rounded-lg border border-hairline/10 text-muted transition hover:bg-panel hover:text-app-fg"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="ml-1 hidden items-center gap-1 rounded-lg border border-hairline/10 px-3 py-1.5 text-xs font-bold text-app-fg/70 transition hover:border-brand-400/50 hover:text-app-fg sm:flex"
          >
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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
      {item.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.ring} via-surface-800 to-surface-950`} />
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.04] blur-2xl transition group-hover:bg-white/[0.08]" />
        </>
      )}
      {item.thumbnail_url ? (
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/40 to-transparent" />
      ) : null}

      {/* Top badges */}
      <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
        {(item.tag || item.category === 'sports' || item.category === 'virtual_sports' || item.is_featured) ? (
          <span className={`flex items-center gap-1 rounded-full bg-surface-950/70 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider backdrop-blur ${theme.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot} ${(item.tag === 'LIVE' || item.category === 'sports' || item.category === 'virtual_sports') ? 'animate-pulse' : ''}`} />
            {item.tag ?? ((item.category === 'sports' || item.category === 'virtual_sports') ? 'LIVE' : 'HOT')}
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
        <p className={`text-[0.6rem] font-bold uppercase tracking-widest ${theme.chip}`}>{item.provider_name ?? item.provider}</p>
        <h3 className="mt-0.5 font-display text-base font-bold leading-tight text-white">{item.name}</h3>
      </div>

      {/* Hover play overlay — sits over the art placeholder, stays on the fixed dark scale */}
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-950/55 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-500 shadow-glow transition-transform duration-300 group-hover:scale-100">
          <Play className="h-6 w-6 fill-surface-950 text-surface-950" />
        </span>
      </div>
    </button>
  );
}

// A titled row of game cards with working ◀ ▶ controls that scroll the
// horizontal carousel by roughly one viewport of cards.
function Section({ title, kicker, Icon, accent, seeAllHref, items, onPlay, theme, ranked }) {
  const scrollRef = useRef(null);
  const scrollByPage = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <section>
      <SectionHeader
        title={title}
        kicker={kicker}
        Icon={Icon}
        accent={accent}
        seeAllHref={seeAllHref}
        onPrev={() => scrollByPage(-1)}
        onNext={() => scrollByPage(1)}
      />
      <div ref={scrollRef} className="edge-fade-x flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item, i) => (
          <GameCard key={item.id ?? item.slug} item={item} onPlay={onPlay} theme={theme} rank={ranked ? i + 1 : undefined} />
        ))}
      </div>
    </section>
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

export default function Theme1Home() {
  const branding = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get('q') ?? '').trim();
  const { games, loading, error } = useGameCatalog();
  const { results: searchResults, loading: searching } = useGameSearch(searchQuery);
  const [openFaq, setOpenFaq] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const providers = useMemo(
    () => [...new Set(games.map((g) => g.provider_name).filter(Boolean))].sort(),
    [games],
  );

  const liveSports = useMemo(
    () => filterByCategory(games, ['sports', 'virtual_sports']).slice(0, 10),
    [games],
  );
  const casinoGames = useMemo(
    () => filterByCategory(games, ['live_casino', 'ai_games']).slice(0, 10),
    [games],
  );
  const trendingGames = useMemo(() => filterFeatured(games, 10), [games]);
  const trendingSlots = useMemo(
    () => filterByCategory(games, 'slots').slice(0, 10),
    [games],
  );

  const handlePlayGame = (game) => {
    if (game?.slug) router.push(playPath(game));
  };

  const isSearching = searchQuery !== '';
  const isFiltering = isSearching || selectedProvider !== null;

  // When searching, filter the live API results; otherwise the provider chips
  // filter the cached catalog client-side.
  const uniqueFilteredGames = useMemo(() => {
    if (isSearching) {
      return selectedProvider ? filterByProvider(searchResults, selectedProvider) : searchResults;
    }
    if (selectedProvider) return filterByProvider(games, selectedProvider);
    return [];
  }, [isSearching, searchResults, selectedProvider, games]);

  return (
    <>
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
                    <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-brand-500/25 blur-2xl" />
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-300">Deposit bonus</p>
                    <p className="mt-2 font-display text-5xl font-black text-app-fg">
                      ₹100<span className="text-2xl text-brand-300">/-</span>
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
              {providers.map((p) => (
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
                {isSearching ? (
                  <>
                    Results for <span className="text-brand-300">“{searchQuery}”</span>{' '}
                  </>
                ) : (
                  'Results '
                )}
                <span className="text-muted/70">({uniqueFilteredGames.length})</span>
              </h2>
              {isSearching && searching && uniqueFilteredGames.length === 0 ? (
                <p className="py-16 text-center text-muted">Searching…</p>
              ) : uniqueFilteredGames.length > 0 ? (
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
          ) : loading ? (
            <p className="py-16 text-center text-muted">Loading games…</p>
          ) : error ? (
            <p className="py-16 text-center text-red-400">{error}. Start the API and import database/init.sql.</p>
          ) : games.length === 0 ? (
            <p className="py-16 text-center text-muted">No games in catalog. Import database/init.sql on the API.</p>
          ) : (
            <>
              <Section
                title="Live Sports"
                kicker="In play now"
                Icon={Trophy}
                accent="emerald"
                seeAllHref={NAV_GAME_LINKS.sports}
                items={liveSports}
                onPlay={handlePlayGame}
                theme={THEMES.sports}
              />

              <Section
                title="Casino Lobby"
                kicker="Top providers"
                Icon={Dices}
                accent="brand"
                seeAllHref={NAV_GAME_LINKS.casino}
                items={casinoGames}
                onPlay={handlePlayGame}
                theme={THEMES.casino}
              />

              <Section
                title="Trending Games"
                kicker="Player favourites"
                Icon={Flame}
                accent="rose"
                seeAllHref="/games/featured"
                items={trendingGames}
                onPlay={handlePlayGame}
                theme={THEMES.trending}
                ranked
              />

              <Section
                title="Trending Slots"
                kicker="Big multipliers"
                Icon={Sparkles}
                accent="brand"
                seeAllHref={NAV_GAME_LINKS.slots}
                items={trendingSlots}
                onPlay={handlePlayGame}
                theme={THEMES.slots}
                ranked
              />

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
                  <span className="inline-flex items-center gap-2 rounded-full border border-hairline/10 bg-panel/60 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-brand-300">
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
    </>
  );
}
