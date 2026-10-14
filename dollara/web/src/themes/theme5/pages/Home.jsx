'use client';

// Theme5 home — VELPLAY light portal. Sections in reference order:
//   hero banner · bonus strip (first deposit / reload / cashback) · Live Sports rail ·
//   Casino provider lobby · All Games · Fantasy · Trending Slot · Exclusive Elite
//   Offers · Game Providers · Why Choose · FAQ.
//
// Games come from the shared useGameCatalog and the provider circles are derived
// from that same catalog, so the lobby reflects what the product actually offers.
// Elite Offers render the real /promotions feed when the product admin has
// configured any. The bonus strip, "why choose" cards and FAQ are marketing copy
// (no shared endpoint backs them), as in the other themes.

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Clock,
  CreditCard,
  Gift,
  Play,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useBanners } from '@/hooks/useBanners';
import { useFaqs } from '@/hooks/useFaqs';
import { usePromotions } from '@/hooks/usePromotions';
import BannerCarousel from '@/components/BannerCarousel';
import { useBranding } from '@/hooks/useBranding';
import { useAuthStore } from '@/store/auth';
import { NAV_GAME_LINKS, playPath, providerEntries, providerHref, PROVIDERS_HREF } from '@/lib/gameRoutes';
import { useAuthModal } from '../shell/authModalContext';
import { T5SectionBar, T5Card } from '../components/ui';

/* ── hero fallback (only when the product admin has uploaded no banners) ── */
const SLIDES = [
  {
    title: 'WELCOME BONUS 5%',
    sub: 'On your first deposit — up to ₹5,000',
    cta: 'Claim Now',
    bg: 'linear-gradient(120deg, #101c33 0%, #1b2a4d 45%, #3b2a12 100%)',
  },
  {
    title: 'DEPOSIT BONUS ₹100',
    sub: 'Deposit now and get extra — no wagering',
    cta: 'Deposit',
    bg: 'linear-gradient(120deg, #16213f 0%, #24345c 45%, #4a2c1a 100%)',
  },
  {
    title: '500+ LIVE TABLES',
    sub: 'Roulette · Blackjack · Baccarat · Teen Patti',
    cta: 'Play Casino',
    bg: 'linear-gradient(120deg, #0f1b33 0%, #1d2b52 45%, #2a1a3f 100%)',
  },
];

// Landing-page registration call to action, shown to signed-out visitors only.
function SignupPrompt({ onSignup, onLogin }) {
  return (
    <section className="mt-3 flex flex-col items-center justify-between gap-3 rounded-xl bg-[#101c33] px-5 py-4 text-center shadow-sm sm:flex-row sm:text-left">
      <div>
        <p className="font-display text-base font-black text-white sm:text-lg">
          Create your free account
        </p>
        <p className="mt-0.5 text-xs text-white/70">
          Sign up in seconds to claim your welcome bonus and start playing.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onSignup}
          className="rounded-lg bg-[#f5c518] px-6 py-2.5 text-sm font-black uppercase tracking-wide text-[#101c33] shadow transition hover:brightness-110"
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={onLogin}
          className="rounded-lg border border-white/25 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/10"
        >
          Log In
        </button>
      </div>
    </section>
  );
}

function HeroFallback({ onCta }) {
  const [slide, setSlide] = useState(0);
  const s = SLIDES[slide];

  return (
    <section className="relative overflow-hidden rounded-xl shadow-sm" style={{ background: s.bg }}>
      <div className="relative flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[300px]">
        <p className="font-display text-3xl font-black italic leading-tight tracking-tight text-[#f5c518] drop-shadow sm:text-5xl">
          {s.title}
        </p>
        <p className="mt-3 text-xs font-bold text-white/85 sm:text-sm">{s.sub}</p>
        <button
          onClick={onCta}
          className="mt-6 rounded-lg bg-[#f5c518] px-8 py-2.5 text-sm font-black uppercase tracking-widest text-[#101c33] shadow transition hover:brightness-110"
        >
          {s.cta}
        </button>
        <p className="mt-6 max-w-lg text-[0.6rem] text-white/45">
          Please play responsibly. Bonuses are meant for entertainment and skill-based engagement only.
          Terms &amp; conditions apply.
        </p>
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
          />
        ))}
      </div>
    </section>
  );
}

/* ── bonus strip ── */
const BONUSES = [
  {
    icon: '💰',
    label: 'First Deposit',
    headline: '100% UP TO',
    sub: '₹20,000 bonus on first deposit',
    href: '/deposit',
  },
  {
    icon: '🎁',
    label: 'Reload Bonus',
    headline: '20% WEEKLY',
    sub: 'Every Monday reload reward',
    href: '/promotions',
  },
  {
    icon: '🔄',
    label: 'Loss Cashback',
    headline: '10% BACK',
    sub: 'Weekly cashback on net losses',
    href: '/promotions',
  },
];

function BonusStrip() {
  return (
    // Three across at every width. On mobile the card stacks its icon above the
    // text and drops the long sub-line, since a third of a phone screen cannot
    // hold the icon-beside-text layout the wider breakpoints use.
    <section className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
      {BONUSES.map((b) => (
        <Link
          key={b.label}
          href={b.href}
          className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-2.5 text-center shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:gap-3 sm:p-4 sm:text-left"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f1f4f8] text-base sm:h-11 sm:w-11 sm:text-xl">
            {b.icon}
          </span>
          <span className="min-w-0 w-full">
            <span className="block truncate text-[0.5rem] font-black uppercase tracking-[0.1em] text-[#94a3b8] sm:text-[0.6rem] sm:tracking-[0.14em]">
              {b.label}
            </span>
            <span className="block truncate font-display text-[0.7rem] font-black uppercase text-[#0f1b33] sm:text-lg">
              {b.headline}
            </span>
            <span className="hidden truncate text-[0.7rem] text-[#64748b] sm:block">{b.sub}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

/* ── horizontally scrolling game rail ── */
function GameRail({ icon, title, games, seeAllHref, loading, onPlay }) {
  const railRef = useRef(null);
  const scrollBy = (dx) => railRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  if (!loading && games.length === 0) return null;

  return (
    <section className="mt-4">
      <T5SectionBar
        icon={icon}
        title={title}
        seeAllHref={seeAllHref}
        onPrev={() => scrollBy(-400)}
        onNext={() => scrollBy(400)}
      />
      <div className="mt-2 rounded-xl bg-white p-3 shadow-sm">
        {loading ? (
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[120px] w-[120px] shrink-0 animate-pulse rounded-lg bg-[#f1f4f8]" />
            ))}
          </div>
        ) : (
          <div ref={railRef} className="flex gap-3 overflow-x-auto scrollbar-hide">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => onPlay(game)}
                className="group relative aspect-square w-[120px] shrink-0 overflow-hidden rounded-lg bg-[#101c33] text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-[132px]"
              >
                {game.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.thumbnail_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-white/30">
                    <Play className="h-7 w-7" />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-5">
                  <span className="block truncate text-[0.65rem] font-black text-white">{game.name}</span>
                </span>
                <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/35">
                  <span className="grid h-10 w-10 scale-90 place-items-center rounded-full bg-[#1d4ed8] opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── exclusive elite offers ── */
function EliteOffers({ promotions }) {
  const offers = promotions.slice(0, 2);

  // No promotable bonuses configured yet. The section used to disappear
  // entirely, which read as a broken/empty band where the heading had been —
  // so it keeps its place and says plainly that offers are on the way.
  if (offers.length === 0) {
    return (
      <section className="mt-4">
        <T5SectionBar title="Exclusive Elite Offers" seeAllHref="/promotions" seeAllLabel="View All" />
        <div
          className="mt-2 flex min-h-[132px] flex-col items-center justify-center rounded-xl p-6 text-center shadow-sm"
          style={{ background: 'linear-gradient(120deg, #101c33 0%, #1e2f56 55%, #3a2a14 100%)' }}
        >
          <p className="font-display text-lg font-black italic uppercase tracking-tight text-[#f5c518]">
            New offers coming soon
          </p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/70">
            Elite promotions land here the moment they go live. Check the
            promotions page for everything running right now.
          </p>
          <Link
            href="/promotions"
            className="mt-3 inline-block text-[0.65rem] font-black uppercase tracking-wide text-white/80 transition hover:text-white"
          >
            View promotions →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <T5SectionBar title="Exclusive Elite Offers" seeAllHref="/promotions" seeAllLabel="View All" />
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {offers.map((p) => (
          <Link
            key={p.id ?? p.title}
            href="/promotions"
            className="group relative min-h-[180px] overflow-hidden rounded-xl p-5 shadow-sm transition hover:shadow-md"
            style={{ background: 'linear-gradient(120deg, #101c33 0%, #1e2f56 55%, #3a2a14 100%)' }}
          >
            <span className="inline-block rounded bg-[#1d4ed8] px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.18em] text-white">
              Elite
            </span>
            <p className="mt-4 font-display text-2xl font-black italic uppercase leading-tight tracking-tight text-[#f5c518]">
              {p.title}
            </p>
            {p.description && (
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/70">{p.description}</p>
            )}
            <span className="mt-4 inline-block text-[0.65rem] font-black uppercase tracking-wide text-white/80 group-hover:text-white">
              Claim now →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── game providers ── */
function GameProviders({ providers }) {
  if (providers.length === 0) return null;

  return (
    <section className="mt-4">
      <T5SectionBar title="Game Providers" seeAllHref={PROVIDERS_HREF} seeAllLabel="View All" />
      <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {providers.map(({ name, logoUrl }) => (
            <Link
              key={name}
              href={providerHref(name)}
              title={name}
              className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-black/[0.07] bg-white p-2 text-center shadow-sm transition hover:border-[#1d4ed8] hover:shadow-md"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={name}
                  loading="lazy"
                  className="h-full w-full object-contain"
                  // A dead logo URL must not leave an empty circle — drop the
                  // image and let the name show through instead.
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span className="line-clamp-2 text-[0.6rem] font-black uppercase leading-tight tracking-wide text-[#0f1b33]">
                  {name}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── why choose ── */
const WHY = [
  { n: '01', label: 'Fast Withdrawal', Icon: Clock },
  { n: '02', label: 'Instant Deposit', Icon: CreditCard },
  { n: '03', label: '1-Click Signup', Icon: UserPlus },
  { n: '04', label: 'Trusted Platform', Icon: ShieldCheck },
];

function WhyChoose({ name }) {
  return (
    <section className="mt-4">
      <T5SectionBar title={`Why Choose ${name}?`} />
      {/* Four across at every width. On mobile the card centres its icon over
          the label — a quarter of a phone screen is too narrow for the
          icon-beside-text row the wider breakpoints use — and the label wraps
          instead of truncating, since both words carry meaning. */}
      <div className="mt-2 grid grid-cols-4 gap-2 sm:gap-3">
        {WHY.map(({ n, label, Icon }) => (
          <T5Card
            key={n}
            className="flex flex-col items-center gap-1.5 p-2.5 text-center sm:flex-row sm:items-center sm:gap-3 sm:p-4 sm:text-left"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1f4f8] text-[#1d4ed8] sm:order-2 sm:h-9 sm:w-9">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 w-full sm:order-1 sm:flex-1">
              <p className="font-display text-sm font-black text-[#cbd5e1] sm:text-xl">{n}</p>
              <p className="mt-0.5 text-[0.55rem] font-black uppercase leading-tight tracking-tight text-[#0f1b33] sm:mt-1 sm:truncate sm:text-xs sm:tracking-wide">
                {label}
              </p>
            </div>
          </T5Card>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ — managed from the product admin (/admin -> FAQs) ── */
function Faq() {
  const { faqs } = useFaqs();
  const [open, setOpen] = useState(null);

  if (faqs.length === 0) return null;

  return (
    <section className="mt-4 space-y-2">
      {faqs.map((f, i) => (
        <div key={f.id ?? i} className="overflow-hidden rounded-xl bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full items-center gap-3 px-4 py-4 text-left"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[#eff4ff] text-[0.7rem] font-black text-[#1d4ed8]">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-xs font-black uppercase tracking-wide text-[#0f1b33] sm:text-sm">
              {f.question}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[#94a3b8] transition-transform ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          {open === i && (
            <p className="border-t border-black/[0.05] px-4 py-4 text-sm leading-relaxed text-[#475569] sm:pl-14">
              {f.answer}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

// How many tiles each home rail holds. The rails scroll horizontally, so this
// is the depth of the row rather than a hard cap on the category.
const RAIL_SIZE = 24;

/* ── page ── */
export default function Theme5Home() {
  const router = useRouter();
  const { open } = useAuthModal();
  const branding = useBranding();
  // One request per rail. A single limited catalog call cannot back these rows:
  // the catalog is ordered by sort_order, so the biggest categories fill the
  // window and the smaller ones (sports, fantasy) get truncated to a tile or
  // two. Asking per category guarantees each rail sees its own games. The hook
  // caches by category, so these are one-time fetches per session.
  const { games: sportsGames, loading: sportsLoading } = useGameCatalog({
    category: 'sports',
    limit: RAIL_SIZE,
  });
  const { games: casinoGames, loading: casinoLoading } = useGameCatalog({
    category: 'live_casino',
    limit: RAIL_SIZE,
  });
  const { games: slotGames, loading: slotsLoading } = useGameCatalog({
    category: 'slots',
    limit: RAIL_SIZE,
  });
  const { games: fantasyGames, loading: fantasyLoading } = useGameCatalog({
    category: 'fantasy',
    limit: RAIL_SIZE,
  });
  const { games, loading } = useGameCatalog();
  const { banners } = useBanners();
  const { promotions } = usePromotions();
  const token = useAuthStore((s) => s.token);

  const name = branding.product_name || 'MAHAKAL WORLD';

  const sports = sportsGames;
  const casino = casinoGames;
  const slots = slotGames;
  // "All Games" is the whole catalog, not the admin-flagged subset: the rail
  // used to read the `featured: true` feed, so it showed only the handful of
  // games an admin had flagged. It scrolls horizontally, so it takes a
  // rail-sized window of the catalog and "See All" opens the rest.
  const allGames = useMemo(() => games.slice(0, RAIL_SIZE), [games]);

  // Provider circles derived from the live catalog — no hardcoded logo list.
  // Shared with the /providers directory so the rail and the full listing can't
  // drift on what a provider is called or which logo it carries; the rail just
  // takes the first screenful.
  const providers = useMemo(() => providerEntries(games).slice(0, 16), [games]);

  const onPlay = (game) => {
    if (!game) return;
    // Fall back to the game_uid when a game has no slug: silently ignoring the
    // click made those tiles look like broken games that "do nothing".
    if (game.slug) router.push(playPath(game));
    else if (game.game_uid) router.push(`/play/${encodeURIComponent(game.game_uid)}`);
  };

  // Hero CTA: signed-in players go to the casino lobby; guests get the login modal.
  const onCta = () => {
    if (token) router.push(NAV_GAME_LINKS.liveCasino);
    else open('login');
  };

  return (
    <div>
      {banners.length > 0 ? (
        <BannerCarousel banners={banners} className="rounded-xl" />
      ) : (
        <HeroFallback onCta={onCta} />
      )}

      {/* Guests get an explicit way to register from the landing page itself.
          Sign-up previously existed only as a small header button, so a new
          visitor landing here had no obvious route into creating an account. */}
      {!token && <SignupPrompt onSignup={() => open('register')} onLogin={() => open('login')} />}

      <BonusStrip />

      <GameRail
        icon="⚽"
        title="Live Sports"
        games={sports}
        seeAllHref={NAV_GAME_LINKS.sports}
        loading={sportsLoading}
        onPlay={onPlay}
      />
      <GameRail
        icon="🔴"
        title="Casino (Provider Lobby)"
        games={casino}
        seeAllHref={NAV_GAME_LINKS.liveCasino}
        loading={casinoLoading}
        onPlay={onPlay}
      />
      <GameRail
        icon="🔥"
        title="All Games"
        games={allGames}
        seeAllHref={NAV_GAME_LINKS.allGames}
        loading={loading}
        onPlay={onPlay}
      />
      <GameRail
        icon="🎮"
        title="Fantasy"
        games={fantasyGames}
        seeAllHref={NAV_GAME_LINKS.fantasy}
        loading={fantasyLoading}
        onPlay={onPlay}
      />
      <GameRail
        icon="🎰"
        title="Trending Slot"
        games={slots}
        seeAllHref={NAV_GAME_LINKS.slots}
        loading={slotsLoading}
        onPlay={onPlay}
      />

      <EliteOffers promotions={promotions} />
      <GameProviders providers={providers} />
      <WhyChoose name={name} />
      <Faq />
    </div>
  );
}
