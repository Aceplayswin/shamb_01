'use client';

// Theme4 home — EXCHANGE teal lobby. Sections in reference order:
//   hero banner carousel · promo arrow cards (Cricket / Slot / Tennis) ·
//   dark casino banner tiles · Top Games rail (from useGameCatalog) ·
//   sports odds boards (Cricket / Soccer / Tennis with back/lay cells).
// Games come from the shared useGameCatalog; the odds boards are presentational
// fixtures (there is no live-odds feed in the shared layer), dated relative to
// today so the board always looks current. CTAs open the shell's auth modal.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Play, Tv, Dice5, Trophy, Cherry } from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useBanners } from '@/hooks/useBanners';
import BannerCarousel from '@/components/BannerCarousel';
import { useAuthStore } from '@/store/auth';
import { filterFeatured, NAV_GAME_LINKS, playPath } from '@/lib/gameRoutes';
import { useAuthModal } from '../shell/authModalContext';
import { T4SectionBar } from '../components/ui';

/* ── hero carousel ── */
const SLIDES = [
  {
    title: ['OWN THE GAME.', 'WIN WITHOUT LIMITS.'],
    sub: 'Cricket 🏏 • Football ⚽ • Tennis 🎾 • Basketball 🏀 • MMA 🥊',
    cta: 'BET NOW',
    bg: 'radial-gradient(80% 90% at 15% 0%, rgba(46,168,255,0.35) 0%, transparent 50%), radial-gradient(70% 80% at 85% 10%, rgba(123,47,247,0.4) 0%, transparent 55%), linear-gradient(160deg, #141a3a 0%, #0c1030 55%, #1a0f38 100%)',
  },
  {
    title: ['500+ LIVE TABLES.', 'DEAL ME IN.'],
    sub: 'Roulette • Blackjack • Baccarat • Teen Patti • Dragon Tiger',
    cta: 'PLAY CASINO',
    bg: 'radial-gradient(80% 90% at 80% 0%, rgba(229,52,44,0.3) 0%, transparent 50%), radial-gradient(70% 80% at 15% 20%, rgba(23,162,176,0.35) 0%, transparent 55%), linear-gradient(160deg, #1a0f24 0%, #0e0a1e 55%, #241035 100%)',
  },
  {
    title: ['INSTANT DEPOSITS.', 'FASTER PAYOUTS.'],
    sub: 'UPI • Paytm • PhonePe • Net Banking • Crypto',
    cta: 'JOIN NOW',
    bg: 'radial-gradient(80% 90% at 20% 10%, rgba(47,191,113,0.3) 0%, transparent 50%), radial-gradient(70% 80% at 85% 0%, rgba(46,168,255,0.3) 0%, transparent 55%), linear-gradient(160deg, #0c1c2e 0%, #0a1424 55%, #10233a 100%)',
  },
];

function HeroCarousel({ onCta }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const s = SLIDES[slide];

  return (
    <section className="relative overflow-hidden" style={{ background: s.bg }}>
      {/* floodlight dots */}
      <div className="pointer-events-none absolute inset-0 opacity-40 theme4-dots" />
      <div className="relative mx-auto flex min-h-[260px] max-w-[1200px] items-center justify-end px-6 py-10 sm:min-h-[340px] sm:px-10">
        <div className="max-w-xl text-right">
          {s.title.map((line) => (
            <p
              key={line}
              className="font-display text-3xl font-black italic leading-tight tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)] sm:text-5xl"
            >
              {line}
            </p>
          ))}
          <p className="mt-4 text-xs font-bold tracking-wide text-white/85 sm:text-sm">{s.sub}</p>
          <button
            onClick={onCta}
            className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-[#7b2ff7] to-[#2ea8ff] px-8 py-2.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_24px_rgba(123,47,247,0.65)] ring-1 ring-white/40 transition hover:brightness-110"
          >
            {s.cta}
          </button>
        </div>
      </div>
      {/* dots */}
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

/* ── promo arrow cards ── */
const PROMOS = [
  {
    label: 'Cricket',
    lines: ['HIT THE SIX', 'BOWL THEM OUT', 'CHASE THE SCORE'],
    href: NAV_GAME_LINKS.sports,
    Icon: Trophy,
  },
  {
    label: 'Slot',
    lines: ['SPIN TO WIN!', 'JACKPOT FEVER!', 'HIT THE SLOTS!'],
    href: NAV_GAME_LINKS.slots,
    Icon: Cherry,
  },
  {
    label: 'Tennis',
    lines: ['SMASH THE ACE', 'RALLY TO WIN!', 'GAME SET MATCH!'],
    href: NAV_GAME_LINKS.sports,
    Icon: Dice5,
  },
];

function PromoCards() {
  return (
    <section className="mt-2 grid gap-2 sm:grid-cols-3">
      {PROMOS.map(({ label, lines, href, Icon }) => (
        <Link
          key={label}
          href={href}
          className="group relative flex items-center overflow-hidden rounded bg-gradient-to-r from-[#0a5560] via-[#10808d] to-[#17a2b0] p-4 shadow-md transition hover:brightness-110"
        >
          <div className="pointer-events-none absolute inset-0 theme4-dots opacity-60" />
          {/* text block with chevron edge */}
          <div className="theme4-arrow relative z-10 bg-[#0a4750]/70 py-3 pl-4 pr-12">
            {lines.map((l) => (
              <p key={l} className="text-[0.7rem] font-black italic leading-snug tracking-wide text-white">
                {l}
              </p>
            ))}
          </div>
          <div className="relative z-10 ml-auto flex flex-col items-center gap-1 pr-2 text-white">
            <Icon className="h-8 w-8 drop-shadow" />
            <span className="font-display text-2xl font-black italic tracking-tight drop-shadow">{label}</span>
          </div>
        </Link>
      ))}
    </section>
  );
}

/* ── dark casino banner tiles ── */
function CasinoBanners() {
  return (
    <section className="mt-2 grid gap-2 sm:grid-cols-2">
      {[
        { label: 'LIVE ROULETTE', emoji: '🎰', href: NAV_GAME_LINKS.liveCasino },
        { label: 'CARD TABLES', emoji: '🃏', href: NAV_GAME_LINKS.liveCasino },
      ].map((b) => (
        <Link
          key={b.label}
          href={b.href}
          className="group relative flex min-h-[110px] items-center justify-center overflow-hidden rounded bg-[#0b0d14] shadow-md"
        >
          <div className="pointer-events-none absolute -left-6 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#17a2b0]/20 blur-2xl" />
          <div className="pointer-events-none absolute -right-6 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[#7b2ff7]/20 blur-2xl" />
          <span className="text-3xl opacity-70 transition group-hover:scale-110">{b.emoji}</span>
          <span className="ml-3 font-display text-lg font-black italic tracking-widest text-white/80 transition group-hover:text-white">
            {b.label}
          </span>
        </Link>
      ))}
    </section>
  );
}

/* ── top games rail ── */
function TopGames({ games, loading, error, onPlay }) {
  const railRef = useRef(null);
  return (
    <section className="mt-4">
      <h2 className="mb-2 text-base font-black text-[#13272b]">Top Games</h2>
      {loading ? (
        <p className="py-6 text-center text-sm text-[#5d7378]">Loading games…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-[#e5342c]">{error}</p>
      ) : (
        <div className="relative">
          <button
            onClick={() => railRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
            className="absolute -left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-[#0e7480] shadow-md sm:grid"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div ref={railRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => onPlay(game)}
                className="group relative aspect-square w-[110px] shrink-0 overflow-hidden rounded bg-gradient-to-br from-[#0a5560] to-[#101c1e] text-left shadow-sm sm:w-[124px]"
              >
                {game.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={game.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-white/30">
                    <Play className="h-7 w-7" />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-4">
                  <span className="block truncate text-[0.65rem] font-bold text-white">{game.name}</span>
                </span>
                <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
              </button>
            ))}
            {games.length === 0 && (
              <p className="py-6 text-sm text-[#5d7378]">No games yet — start the API and seed the DB.</p>
            )}
          </div>
          <button
            onClick={() => railRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
            className="absolute -right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-[#0e7480] shadow-md sm:grid"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── odds boards ── */

// Presentational fixture lists, dated relative to "now" so the board reads
// current. `day` = offset in days from today.
const BOARDS = [
  {
    title: 'Cricket',
    href: NAV_GAME_LINKS.sports,
    hasDraw: false,
    rows: [
      { day: 0, time: '13:00', match: 'Zimbabwe v Bangladesh', tags: ['tv', 'bm', 'f'], odds: [2.52, 2.54, null, null, 1.65, 1.66] },
      { day: 0, time: '22:00', match: 'England v India', tags: ['bm', 'f'], odds: [1.84, 1.85, null, null, 2.18, 2.2] },
      { day: 1, time: '06:00', match: 'Washington Freedom v Los Angeles Knight Riders', tags: ['bm', 'f'], odds: [1.73, 1.93, null, null, 2.06, 2.38] },
    ],
  },
  {
    title: 'Soccer',
    href: NAV_GAME_LINKS.sports,
    hasDraw: true,
    rows: [
      { day: 1, time: '01:30', match: 'France v Morocco', tags: [], odds: [1.62, 1.63, 4, 4.1, 7.4, 7.6] },
      { day: 2, time: '00:30', match: 'Spain v Belgium', tags: [], odds: [1.69, 1.7, 4, 4.1, 6, 6.2] },
    ],
  },
  {
    title: 'Tennis',
    href: NAV_GAME_LINKS.sports,
    hasDraw: false,
    rows: [
      { day: 0, time: '14:30', match: 'Sim Waltert v Ley Romero Gormaz', tags: ['tv', 'bm'], odds: [1.56, 1.58, null, null, 2.72, 2.8] },
      { day: 0, time: '16:00', match: 'Iren Burillo v Ka Quevedo', tags: ['tv'], odds: [5.7, 5.9, null, null, 1.2, 1.22] },
      { day: 0, time: '18:00', match: 'Muchova v C Gauff', tags: ['tv', 'bm'], odds: [1.91, 1.93, null, null, 2.06, 2.1] },
    ],
  },
];

function fixtureDate(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function OddsCell({ value, kind }) {
  return (
    <span
      className={`grid h-8 w-11 place-items-center rounded-sm text-xs font-bold text-[#13272b] sm:w-14 ${
        kind === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'
      } ${value == null ? 'opacity-60' : ''}`}
    >
      {value ?? ''}
    </span>
  );
}

function TagChip({ tag }) {
  if (tag === 'tv') {
    return (
      <span className="grid h-4 w-5 place-items-center rounded-sm bg-[#0a5560] text-white">
        <Tv className="h-2.5 w-2.5" />
      </span>
    );
  }
  return (
    <span className="grid h-4 min-w-5 place-items-center rounded-sm bg-[#2e6da4] px-0.5 text-[0.5rem] font-black uppercase text-white">
      {tag}
    </span>
  );
}

function OddsBoard({ board }) {
  // Dates are computed on the client only (after mount) so SSR HTML can never
  // disagree with the client around midnight.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="mt-4">
      <T4SectionBar>{board.title}</T4SectionBar>
      <div className="rounded-b border border-t-0 border-black/[0.07] bg-white">
        {/* 1 / x / 2 header */}
        <div className="flex items-center justify-end gap-1 border-b border-black/[0.06] px-2 py-1 pr-2">
          {['1', 'x', '2'].map((h) => (
            <span key={h} className="w-[92px] text-center text-xs font-black text-[#13272b] sm:w-[116px]">
              {h}
            </span>
          ))}
        </div>

        {board.rows.map((row) => (
          <Link
            key={row.match}
            href={board.href}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-black/[0.05] px-2 py-2 transition last:border-b-0 hover:bg-[#f2f8f9] sm:flex-nowrap"
          >
            <span className="whitespace-nowrap text-xs font-black text-[#0e7480]">
              {mounted ? fixtureDate(row.day) : ''} {row.time}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#13272b]">
              <span className="mr-1 text-[#8aa0a4]">|</span> {row.match}
            </span>
            {row.tags.length > 0 && (
              <span className="flex items-center gap-1">
                {row.tags.map((t) => <TagChip key={t} tag={t} />)}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1">
              {row.odds.map((v, i) => (
                <OddsCell key={i} value={v} kind={i % 2 === 0 ? 'back' : 'lay'} />
              ))}
            </span>
          </Link>
        ))}

        <div className="px-3 py-1.5 text-right">
          <Link href={board.href} className="text-xs font-bold text-[#0e7480] hover:underline">
            View More...
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── page ── */
export default function Theme4Home() {
  const router = useRouter();
  const { open } = useAuthModal();
  const { games, loading, error } = useGameCatalog();
  const { banners } = useBanners();
  const token = useAuthStore((s) => s.token);

  const featured = useMemo(() => filterFeatured(games, 14), [games]);

  const onPlay = (game) => {
    if (game?.slug) router.push(playPath(game));
  };

  // BET NOW: logged-in players go to sports; guests get the login modal.
  const onCta = () => {
    if (token) router.push(NAV_GAME_LINKS.sports);
    else open('login');
  };

  return (
    <div>
      {banners.length > 0 ? (
        <div className="mx-auto max-w-[1200px] px-2 pt-2 sm:px-3">
          <BannerCarousel banners={banners} className="rounded-2xl" />
        </div>
      ) : (
        <HeroCarousel onCta={onCta} />
      )}
      <div className="mx-auto max-w-[1200px] px-2 pb-6 pt-2 sm:px-3">
        <PromoCards />
        <CasinoBanners />
        <TopGames games={featured} loading={loading} error={error} onPlay={onPlay} />
        {BOARDS.map((b) => <OddsBoard key={b.title} board={b} />)}
      </div>
    </div>
  );
}
