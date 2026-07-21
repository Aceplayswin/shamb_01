'use client';

// Theme5 home — VELPLAY light portal. Sections in reference order:
//   hero banner · bonus strip (first deposit / reload / refer) · Live Sports rail ·
//   Casino provider lobby · Trending Games · Trending Slot · Exclusive Elite
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
import { usePromotions } from '@/hooks/usePromotions';
import BannerCarousel from '@/components/BannerCarousel';
import { useBranding } from '@/hooks/useBranding';
import { useAuthStore } from '@/store/auth';
import { filterByCategory, filterFeatured, NAV_GAME_LINKS, playPath } from '@/lib/gameRoutes';
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
    icon: '👥',
    label: 'Refer & Earn',
    headline: '₹500 PER',
    sub: 'Per friend referred & deposited',
    href: '/refer',
  },
];

function BonusStrip() {
  return (
    <section className="mt-3 grid gap-3 sm:grid-cols-3">
      {BONUSES.map((b) => (
        <Link
          key={b.label}
          href={b.href}
          className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#f1f4f8] text-xl">
            {b.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#94a3b8]">
              {b.label}
            </span>
            <span className="block truncate font-display text-lg font-black uppercase text-[#0f1b33]">
              {b.headline}
            </span>
            <span className="block truncate text-[0.7rem] text-[#64748b]">{b.sub}</span>
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
  if (offers.length === 0) return null;

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
      <T5SectionBar title="Game Providers" seeAllHref={NAV_GAME_LINKS.slots} seeAllLabel="View All" />
      <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {providers.map((name) => (
            <Link
              key={name}
              href={NAV_GAME_LINKS.slots}
              className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-black/[0.07] bg-white px-2 text-center shadow-sm transition hover:border-[#1d4ed8] hover:shadow-md"
            >
              <span className="line-clamp-2 text-[0.6rem] font-black uppercase leading-tight tracking-wide text-[#0f1b33]">
                {name}
              </span>
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
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map(({ n, label, Icon }) => (
          <T5Card key={n} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-black text-[#cbd5e1]">{n}</p>
              <p className="mt-1 truncate text-xs font-black uppercase tracking-wide text-[#0f1b33]">
                {label}
              </p>
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1f4f8] text-[#1d4ed8]">
              <Icon className="h-4 w-4" />
            </span>
          </T5Card>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ ── */
const FAQS = [
  {
    q: 'How do I create an account?',
    a: 'Tap Sign Up, enter your name, mobile number, and a password. It takes under a minute and you can deposit straight away.',
  },
  {
    q: 'Is online betting legal in India?',
    a: 'Rules vary by state. Skill-based gaming is permitted in most of India, but a few states restrict online real-money play. Please check the law that applies where you live before playing.',
  },
  {
    q: 'How do I withdraw my winnings?',
    a: 'Open Withdraw, enter an amount above the minimum, and pick your payout method. Requests are reviewed by our team and paid to your verified UPI or bank account.',
  },
  {
    q: 'Can I ever win in an online casino?',
    a: 'Yes — every round is settled by the provider’s certified RNG or a live dealer, and payouts are credited to your wallet automatically. Outcomes are random, so never stake more than you can afford to lose.',
  },
  {
    q: 'Is online casino a skill or luck?',
    a: 'Both. Card games such as poker and rummy reward skill and judgement, while slots and roulette are pure chance. Knowing which is which is the best way to play sensibly.',
  },
];

function Faq() {
  const [open, setOpen] = useState(null);

  return (
    <section className="mt-4 space-y-2">
      {FAQS.map((f, i) => (
        <div key={f.q} className="overflow-hidden rounded-xl bg-white shadow-sm">
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
              {f.q}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[#94a3b8] transition-transform ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          {open === i && (
            <p className="border-t border-black/[0.05] px-4 py-4 text-sm leading-relaxed text-[#475569] sm:pl-14">
              {f.a}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

/* ── page ── */
export default function Theme5Home() {
  const router = useRouter();
  const { open } = useAuthModal();
  const branding = useBranding();
  const { games, loading } = useGameCatalog();
  const { banners } = useBanners();
  const { promotions } = usePromotions();
  const token = useAuthStore((s) => s.token);

  const name = branding.product_name || 'DOLLARA';

  const sports = useMemo(() => filterByCategory(games, 'sports').slice(0, 14), [games]);
  const casino = useMemo(() => filterByCategory(games, 'live_casino').slice(0, 14), [games]);
  const slots = useMemo(() => filterByCategory(games, 'slots').slice(0, 14), [games]);
  const trending = useMemo(() => filterFeatured(games, 14), [games]);

  // Provider circles derived from the live catalog — no hardcoded logo list.
  const providers = useMemo(() => {
    const seen = [];
    games.forEach((g) => {
      if (g.provider_name && !seen.includes(g.provider_name)) seen.push(g.provider_name);
    });
    return seen.slice(0, 16);
  }, [games]);

  const onPlay = (game) => {
    if (game?.slug) router.push(playPath(game));
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

      <BonusStrip />

      <GameRail
        icon="⚽"
        title="Live Sports"
        games={sports}
        seeAllHref={NAV_GAME_LINKS.sports}
        loading={loading}
        onPlay={onPlay}
      />
      <GameRail
        icon="🔴"
        title="Casino (Provider Lobby)"
        games={casino}
        seeAllHref={NAV_GAME_LINKS.liveCasino}
        loading={loading}
        onPlay={onPlay}
      />
      <GameRail
        icon="🔥"
        title="Trending Games"
        games={trending}
        seeAllHref={NAV_GAME_LINKS.liveCasino}
        loading={loading}
        onPlay={onPlay}
      />
      <GameRail
        icon="🎮"
        title="Trending Slot"
        games={slots}
        seeAllHref={NAV_GAME_LINKS.slots}
        loading={loading}
        onPlay={onPlay}
      />

      <EliteOffers promotions={promotions} />
      <GameProviders providers={providers} />
      <WhyChoose name={name} />
      <Faq />
    </div>
  );
}
