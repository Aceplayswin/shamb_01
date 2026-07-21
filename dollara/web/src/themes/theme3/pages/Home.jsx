'use client';

// Theme3 home — VELPLAY light lobby. Sections in reference order:
//   hero + LIVE NOW rail · stat strip · latest-news marquee · live-sports carousel ·
//   game rows (from useGameCatalog) · elite offers · game providers · why choose us ·
//   payment methods · FAQ accordion.
// Data comes from the shared useGameCatalog / useBranding; the auth CTAs open the
// shell's split-panel modals via the auth-modal context.

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, ChevronDown, Play, Radio, Zap, IndianRupee,
  UserPlus, ShieldCheck, Trophy,
} from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useBranding } from '@/hooks/useBranding';
import { useBanners } from '@/hooks/useBanners';
import { useFaqs } from '@/hooks/useFaqs';
import BannerCarousel from '@/components/BannerCarousel';
import { filterFeatured, filterByCategory, NAV_GAME_LINKS, playPath } from '@/lib/gameRoutes';
import { useAuthModal } from '../shell/authModalContext';

const STATS = [
  { value: '100%', label: 'First Deposit', color: 'text-[#c79a3b]' },
  { value: '20%', label: 'Reload Bonus', color: 'text-[#2fbf71]' },
  { value: '₹500', label: 'Refer & Earn', color: 'text-[#e5484d]' },
  { value: 'Live', label: 'Sports', color: 'text-[#1b1726]' },
];

const NEWS = [
  'New Bonus System upgrade in 15 days',
  'New Live Casino Games launching in 7 days',
  'Mega Slots Tournament starts in 10 days',
  'Weekly Cashback update version 2.0 releasing soon',
];

const WHY = [
  { n: '01', Icon: Zap, title: 'Fast Withdrawal', desc: 'Quick payout flow with smooth account verification.' },
  { n: '02', Icon: IndianRupee, title: 'Instant Deposit', desc: 'Add funds in seconds through popular payment options.' },
  { n: '03', Icon: UserPlus, title: '1-Click Signup', desc: 'Create your account quickly and start playing faster.' },
  { n: '04', Icon: ShieldCheck, title: 'Trusted Platform', desc: 'Secure, reliable experience with support when needed.' },
];

const PAYMENTS = ['UPI', 'IMPS / NEFT', 'Bitcoin', 'USDT', 'PhonePe', 'Google Pay', 'Paytm'];

/* ── pieces ── */
function GameCard({ game, onPlay, wide = false }) {
  return (
    <button
      onClick={() => onPlay(game)}
      className={`group relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        wide ? 'w-[220px]' : 'w-[150px]'
      }`}
    >
      <span className={`relative block overflow-hidden ${wide ? 'aspect-[16/10]' : 'aspect-[3/4]'} bg-gradient-to-br from-[#efe9f6] to-[#e2dcf0]`}>
        {game.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[#b6aecb]">
            <Play className="h-7 w-7" />
          </span>
        )}
        <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 scale-90 place-items-center rounded-full bg-gradient-to-br from-[#e9c56b] to-[#b8862f] opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
            <Play className="h-5 w-5 fill-[#241b0e] text-[#241b0e]" />
          </span>
        </span>
      </span>
      <span className="px-3 py-2">
        <span className="block truncate text-sm font-black text-[#1b1726]">{game.name}</span>
        <span className="block truncate text-xs text-[#9a94a8]">{game.provider_name ?? game.provider ?? ''}</span>
      </span>
    </button>
  );
}

function SectionHeader({ Icon, title, count, seeAllHref, scrollRef }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-display text-xl font-black text-[#1b1726]">
        {Icon ? <Icon className="h-5 w-5 text-[#c79a3b]" /> : null}
        {title}
        {count != null ? (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#f3ead4] px-2 text-xs font-black text-[#9a7a24]">
            {count}
          </span>
        ) : null}
      </h2>
      <div className="flex items-center gap-2">
        {scrollRef ? (
          <>
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-[#4a4458] shadow-sm transition hover:border-[#c79a3b]/50"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-[#4a4458] shadow-sm transition hover:border-[#c79a3b]/50"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
        {seeAllHref ? (
          <Link href={seeAllHref} className="text-xs font-black text-[#6b6579] transition hover:text-[#c79a3b]">
            See All
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function Theme3Home() {
  const router = useRouter();
  const branding = useBranding();
  const { open } = useAuthModal();
  const { games, loading, error } = useGameCatalog();
  const { banners } = useBanners();
  const { faqs } = useFaqs();
  const [openFaq, setOpenFaq] = useState(0);

  const liveSportsRef = useRef(null);
  const fishingRef = useRef(null);

  const featured = useMemo(() => filterFeatured(games, 12), [games]);
  const liveSports = useMemo(() => {
    const s = filterByCategory(games, ['sports', 'virtual_sports']);
    return (s.length ? s : featured).slice(0, 10);
  }, [games, featured]);
  const casino = useMemo(() => {
    const c = filterByCategory(games, ['live_casino', 'ai_games']);
    return (c.length ? c : featured).slice(0, 10);
  }, [games, featured]);
  const providers = useMemo(
    () => [...new Set(games.map((g) => g.provider_name).filter(Boolean))].slice(0, 8),
    [games],
  );

  const onPlay = (game) => {
    if (game?.slug) router.push(playPath(game));
  };

  const brandName = branding.product_name || 'VELPLAY';

  return (
    <div className="mx-auto max-w-[1500px] px-3 pb-4 pt-4 sm:px-5">
      {/* ===== Hero + Live Now rail ===== */}
      {banners.length > 0 ? (
        /* Admin-controlled banner carousel replaces the default hero+rail. */
        <BannerCarousel banners={banners} className="border border-black/[0.06] shadow-[0_24px_60px_-40px_rgba(36,27,58,0.6)]" />
      ) : (
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_24px_60px_-40px_rgba(36,27,58,0.6)]">
          <div className="grid min-h-[280px] place-items-center bg-gradient-to-br from-[#faf6ec] via-white to-[#f1ebf6] p-10 sm:min-h-[360px]">
            <div className="text-center">
              <span className="font-display text-6xl font-black tracking-tighter text-[#c79a3b] drop-shadow-sm sm:text-8xl">
                {brandName.charAt(0).toUpperCase()}
              </span>
              <p className="mt-2 font-display text-2xl font-black text-[#1b1726]">{brandName}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => open('register')} className="rounded-xl bg-gradient-to-br from-[#e9c56b] via-[#c79a3b] to-[#b8862f] px-6 py-2.5 text-sm font-black text-[#241b0e] shadow-lg transition hover:brightness-105">
                  Play Now
                </button>
                <Link href={NAV_GAME_LINKS.slots} className="rounded-xl border border-black/10 bg-white px-6 py-2.5 text-sm font-black text-[#1b1726] shadow-sm transition hover:border-[#c79a3b]/50">
                  Browse Games
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Live Now */}
        <aside className="flex flex-col rounded-3xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#e5484d]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#e5484d]" /> Live Now
            </span>
            <span className="text-xs text-[#9a94a8]">0 events</span>
          </div>
          <div className="flex flex-1 items-center justify-center py-14 text-center text-sm text-[#9a94a8]">
            No live matches available.
          </div>
          <Link href={NAV_GAME_LINKS.sports} className="border-t border-black/[0.06] pt-3 text-center text-sm font-black text-[#c79a3b] transition hover:underline">
            View all 0 live events →
          </Link>
        </aside>
      </section>
      )}

      {/* ===== Stat strip ===== */}
      <section className="mt-4 grid grid-cols-2 divide-x divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-r from-[#faf6ec] via-white to-[#f1ebf6] shadow-sm sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="px-5 py-5">
            <p className={`font-display text-2xl font-black ${s.color}`}>
              {s.label === 'Sports' ? <Trophy className="mb-1 inline h-6 w-6 text-[#1b1726]" /> : null} {s.value}
            </p>
            <p className="mt-0.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#9a94a8]">{s.label}</p>
          </div>
        ))}
      </section>

      {/* ===== Latest news marquee ===== */}
      <section className="mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-white px-3 py-3 shadow-sm">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#f3ead4] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#9a7a24]">
          <Radio className="h-3 w-3" /> Latest News
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
            {[...NEWS, ...NEWS].map((n, i) => (
              <span key={i} className="flex items-center gap-2 text-sm text-[#4a4458]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c79a3b]" /> {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Live Sports carousel ===== */}
      <section className="mt-8">
        <SectionHeader Icon={Trophy} title="Live Sports" count={liveSports.length} seeAllHref={NAV_GAME_LINKS.sports} scrollRef={liveSportsRef} />
        {loading ? (
          <p className="py-8 text-center text-[#9a94a8]">Loading games…</p>
        ) : error ? (
          <p className="py-8 text-center text-[#e5484d]">{error}</p>
        ) : (
          <div ref={liveSportsRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {liveSports.map((g) => <GameCard key={g.id} game={g} onPlay={onPlay} wide />)}
          </div>
        )}
      </section>

      {/* ===== Casino / fishing row ===== */}
      {!loading && !error && casino.length > 0 && (
        <section className="mt-8">
          <SectionHeader Icon={Play} title="Popular Games" count={casino.length} seeAllHref={NAV_GAME_LINKS.casino} scrollRef={fishingRef} />
          <div ref={fishingRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {casino.map((g) => <GameCard key={g.id} game={g} onPlay={onPlay} />)}
          </div>
        </section>
      )}

      {/* ===== Exclusive Elite Offers ===== */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-black text-[#1b1726]">
            <span className="h-5 w-1 rounded-full bg-[#c79a3b]" /> Exclusive Elite Offers
          </h2>
          <Link href="/register" className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-black text-[#6b6579] shadow-sm transition hover:text-[#c79a3b]">
            VIEW ALL
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="relative grid min-h-[180px] place-items-center overflow-hidden rounded-2xl border border-[#c79a3b]/25 bg-white shadow-sm">
              <span className="absolute left-4 top-4 rounded-full bg-gradient-to-br from-[#e9c56b] to-[#b8862f] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#241b0e]">
                Elite
              </span>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#efe9f6]/60 to-white" />
              <p className="relative text-sm font-black uppercase tracking-[0.2em] text-[#b6aecb]">Offer Coming Soon</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Game Providers ===== */}
      <section className="mt-10">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#2a2140] to-[#171029] px-5 py-4 text-white shadow-sm">
          <div>
            <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#e9c56b]/80">Studio Network</p>
            <p className="font-display text-xl font-black">Game Providers</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-black text-white/70">
              {providers.length || 24} Partners
            </span>
            <Link href={NAV_GAME_LINKS.casino} className="rounded-full bg-white px-4 py-1.5 text-xs font-black text-[#241b3a]">
              VIEW ALL
            </Link>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 rounded-2xl border border-black/[0.06] bg-white/70 p-4 shadow-sm sm:grid-cols-4 lg:grid-cols-8">
          {(providers.length ? providers : Array.from({ length: 8 }, (_, i) => `Studio ${i + 1}`)).map((p) => (
            <div key={p} className="grid aspect-square place-items-center rounded-2xl border border-[#c79a3b]/15 bg-gradient-to-br from-white to-[#faf6ec] p-3 text-center text-xs font-black text-[#4a4458] shadow-sm">
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Why Choose Us ===== */}
      <section className="mt-12 theme3-grid rounded-3xl p-6 sm:p-8">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#c79a3b]">Built for Fast Play</p>
        <h2 className="mt-1 font-display text-3xl font-black text-[#1b1726] sm:text-4xl">Why Choose Us</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ n, Icon, title, desc }) => (
            <div key={n} className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <span className="pointer-events-none absolute right-3 top-2 font-display text-5xl font-black text-black/[0.05]">{n}</span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#e9c56b] to-[#b8862f] text-[#241b0e]">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-lg font-black text-[#1b1726]">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6b6579]">{desc}</p>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <p className="mt-8 text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#9a94a8]">Payment Methods</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAYMENTS.map((p) => (
            <span key={p} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-black text-[#4a4458] shadow-sm">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ===== FAQ — managed from the product admin (/admin -> FAQs) ===== */}
      {faqs.length > 0 && (
        <section className="mt-12">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#c79a3b]">Need Clarity?</p>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="font-display text-3xl font-black text-[#1b1726] sm:text-4xl">Frequently Asked Questions</h2>
            <span className="hidden rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-black text-[#6b6579] shadow-sm sm:block">
              {faqs.length} Questions
            </span>
          </div>
          <div className="mt-6 space-y-3">
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={f.id ?? i} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#e9c56b] to-[#b8862f] text-xs font-black text-[#241b0e]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm font-black uppercase tracking-wide text-[#1b1726]">{f.question}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-[#9a94a8] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <p className="border-t border-black/[0.05] px-4 py-4 pl-[3.75rem] text-sm text-[#6b6579]">{f.answer}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
