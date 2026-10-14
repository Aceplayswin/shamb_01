'use client';

// Theme5 top chrome — two stacked strips:
//   1. Clean white header: brand mark on the left, the universal game search
//      in the middle (md: and up), account actions on the right (PLAY DEMO /
//      SIGN UP / LOG IN, or the signed-in menu).
//   2. The CATEGORY row (Home, Sports, Casino, Slots, Fantasy, Promotions),
//      led on phones by the search icon that opens the full-screen search
//      sheet (see GameSearch.jsx).
//
// Strip 2 is hidden on phones while the player is inside their own account
// pages (see accountRoutes.js) — it is lobby navigation, and those pages need
// the vertical space for the task at hand.
//
// Guests get an account button that opens the shell's auth modal; signed-in
// players get the ProfileMenu instead.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/hooks/useBranding';
import { DEMO_ACCOUNT_ENABLED, useDemoLogin } from '@/hooks/useDemoLogin';
import { ProfileMenu } from '@/components/ProfileMenu';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { useAuthModal } from './authModalContext';
import { isAccountRoute, HIDE_ON_MOBILE } from './accountRoutes';
import { Theme5SearchBar, Theme5SearchButton } from './GameSearch';

const NAV = [
  { label: 'Home', icon: '🏠', href: '/' },
  { label: 'Sports', icon: '⚽', href: NAV_GAME_LINKS.sports },
  { label: 'Casino', icon: '🎰', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Slots', icon: '🎰', href: NAV_GAME_LINKS.slots },
  { label: 'Fantasy Games', icon: '🎮', href: NAV_GAME_LINKS.fantasy },
  { label: 'Promotions', icon: '💰', href: '/promotions' },
];

export function Theme5BrandMark({ name, compact = false }) {
  const branding = useBranding();
  const label = name || branding.product_name || 'MAHAKAL WORLD';
  // First letter of each of the first two words: "Mahakal World" -> "MW".
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  // Logo mark (the dark yellow-wordmark badge, or the uploaded logo image)
  // beside the product name + tagline, matching the admin console's layout.
  //
  // The product name shows at every width; only the tagline drops on mobile,
  // where the account actions need the room. The name truncates rather than
  // pushing them off-screen. Without an uploaded logo the badge IS the
  // wordmark, so the two swap roles by breakpoint (see below) instead of
  // printing the brand name twice.
  return (
    <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:shrink-0 sm:gap-3">
      {branding.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logo_url}
          alt={label}
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
        />
      ) : (
        // No uploaded logo: show the full wordmark on mobile (where it is the
        // only brand text that fits) but just the initials from sm: up, so it
        // does not repeat the name spelled out beside it.
        <span className="shrink-0 rounded bg-[#101c33] px-2 py-1 leading-none shadow-sm">
          <span className="block font-display text-sm font-black italic tracking-tight text-[#f5c518] sm:hidden">
            {label.toUpperCase()}
          </span>
          <span className="hidden font-display text-sm font-black italic tracking-tight text-[#f5c518] sm:block">
            {initials}
          </span>
        </span>
      )}
      <span className={`min-w-0 ${branding.logo_url ? 'block' : 'hidden sm:block'}`}>
        <span className="block truncate font-display text-sm font-black leading-none text-[#101c33] sm:text-base">
          {label.toUpperCase()}
        </span>
        {!compact && (
          <span className="mt-1 hidden text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#101c33]/40 sm:block">
            Play · Win · Repeat
          </span>
        )}
      </span>
    </Link>
  );
}

// Which category the URL sits in. Matched on path alone (exact for "/", prefix
// otherwise) so nothing here reads the URL query — that keeps the whole header
// prerenderable, which matters because this shell is mounted in the root layout
// and so wraps every route.
//
// Casino and Slots both live under /games/*, and Home matches only "/", so the
// first match wins and each path resolves to exactly one category.
function useRouteCategory() {
  const pathname = usePathname();
  const active = NAV.find((c) =>
    c.href === '/' ? pathname === '/' : pathname?.startsWith(c.href.split('?')[0]),
  );
  return active ?? NAV[0];
}

// Horizontal scrollers get edge fades + arrow buttons, but only on the side
// that has more to show — a static gradient over a list that already fits reads
// as a rendering bug. Recomputed on scroll, on resize, and whenever the list
// changes (`resetKey`).
function useScrollAffordance(resetKey) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft > 4, end: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, resetKey]);

  const scrollBy = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  return { ref, edges, sync, scrollBy };
}

// The chevron buttons flanking a scroller, shown on every width — touch users
// need them most, since the rails carry no visible scrollbar.
//
// Sized in px, not rem: globals.css sets html{font-size:14px}, which would
// shrink a rem-based `h-8` to 28px — under the ~44px comfortable touch target.
// The hit area is padded out to 44px on touch while the visible disc stays
// small, so the control is easy to hit without dominating the strip.
//
// These are real controls rather than decoration, so they stay focusable and
// labelled. The scrollers themselves are still swipeable and keyboard-
// reachable; the buttons are an additional affordance, not the only one.
function ScrollButton({ side, onClick, label, tone = 'light', className = 'top-1/2' }) {
  const Icon = side === 'start' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute ${side === 'start' ? 'left-1' : 'right-1'} ${className} theme5-scroll-btn z-20 grid -translate-y-1/2 place-items-center rounded-full shadow-md outline-none transition active:scale-95 focus-visible:ring-2 md:shadow-sm ${
        tone === 'dark'
          ? 'border border-white/20 bg-[#22314f] text-white focus-visible:ring-white/50 hover:bg-[#2c3d61]'
          : 'border border-black/10 bg-white text-[var(--t5-ink)] focus-visible:ring-[var(--t5-blue)]/40 hover:border-[var(--t5-blue)] hover:text-[var(--t5-blue)]'
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// Category row under the clean header.
function CategoryNav({ active }) {
  const { ref, edges, sync, scrollBy } = useScrollAffordance(active.label);

  return (
    // Phones: the game search trigger is pinned at the start of this bar —
    // the white header above has no room left beside the guest actions — and
    // the category scroller takes the rest. From md: search is a field in the
    // header, the trigger is hidden and the scroller spans the bar as before.
    <div className="theme5-catbar flex md:block">
      <Theme5SearchButton className="flex w-[48px] shrink-0 items-center justify-center border-r border-white/10 bg-white/[0.06] text-white outline-none transition active:bg-white/15 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 md:hidden" />
      <div className="relative min-w-0 flex-1">
        {/* Edge fades signal "more to scroll" on touch, where no arrows show. */}
        <div
          className={`theme5-fade-l pointer-events-none absolute inset-y-0 left-0 z-10 w-12 transition-opacity md:w-10 ${
            edges.start ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`theme5-fade-r pointer-events-none absolute inset-y-0 right-0 z-10 w-12 transition-opacity md:w-10 ${
            edges.end ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {edges.start && (
          <ScrollButton side="start" tone="dark" label="Scroll categories left" onClick={() => scrollBy(-1)} />
        )}
        {edges.end && (
          <ScrollButton side="end" tone="dark" label="Scroll categories right" onClick={() => scrollBy(1)} />
        )}

        <nav className="mx-auto max-w-[1500px] px-2 sm:px-3">
          <ul
            ref={ref}
            onScroll={sync}
            className="theme5-rail-center flex items-center gap-1 overflow-x-auto scrollbar-hide"
          >
            {NAV.map((item) => {
              const current = item.label === active.label;
              return (
                <li key={item.label} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={`group relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-3.5 py-3 text-xs font-black uppercase tracking-wide outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/50 sm:px-4 ${
                      current ? 'text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {/* Gold glow behind the active tab, so the current section
                        reads instantly against the navy. */}
                    {current && <span className="theme5-cat-active" aria-hidden />}
                    <span
                      className={`relative text-sm leading-none transition-transform duration-200 ${
                        current ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="relative">{item.label}</span>
                    {/* Gold underline: grows from the centre on hover, full width
                        when current — one element doing both states. */}
                    <span
                      className={`absolute inset-x-2.5 bottom-0 h-[3px] origin-center rounded-t bg-[var(--t5-gold)] transition-transform duration-200 ${
                        current ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function Theme5TopBar() {
  const pathname = usePathname();
  const branding = useBranding();
  const { open } = useAuthModal();
  const { tryDemo, demoLoading } = useDemoLogin({ redirectTo: '/' });

  const token = useAuthStore((s) => s.token);
  const wallet = useAuthStore((s) => s.wallet);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  // Real + bonus, not `available` — a pending withdrawal only holds funds, it
  // does not debit them, so netting the hold off would show a smaller figure.
  const balance = wallet?.total ?? 0;

  const active = useRouteCategory();
  // Account pages drop the lobby strip on phones — see accountRoutes.js.
  const hideLobbyNav = isAccountRoute(pathname);

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      {/* Clean white header — brand mark and account actions only. */}
      <div className="bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-2 py-2 sm:gap-4 sm:px-3">
          <Theme5BrandMark name={branding.product_name} />

          {/* Search field from md: up. Below that the field is hidden and this
              is just the spacer that keeps the account actions pinned right. */}
          <div className="flex min-w-0 flex-1 justify-center">
            <Theme5SearchBar />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isHydrated && token ? (
              <>
                {/* Wallet pill: balance plus a "+" that goes straight to
                    deposit — the top-up path players use most. */}
                <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white py-1 pl-3 pr-1 shadow-sm">
                  <Wallet className="hidden h-4 w-4 shrink-0 text-[var(--t5-muted)] sm:block" />
                  <span className="whitespace-nowrap text-sm font-black tabular-nums text-[var(--t5-ink)]">
                    ₹{Number(balance).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <Link
                    href="/deposit"
                    aria-label="Add funds"
                    title="Add funds"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--t5-blue)] text-white transition hover:brightness-110 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                  </Link>
                </div>
                <ProfileMenu variant="theme5" />
              </>
            ) : isHydrated ? (
              <>
                {DEMO_ACCOUNT_ENABLED && (
                  <button
                    type="button"
                    onClick={tryDemo}
                    disabled={demoLoading}
                    className="whitespace-nowrap rounded-lg border border-black/15 bg-white px-3 py-2 text-[0.65rem] font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] disabled:opacity-60 sm:px-5 sm:text-xs"
                  >
                    {demoLoading ? 'Starting…' : 'Play Demo'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => open('register')}
                  className="whitespace-nowrap rounded-lg border border-black/15 bg-white px-3 py-2 text-[0.65rem] font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] sm:px-5 sm:text-xs"
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => open('login')}
                  className="whitespace-nowrap rounded-lg bg-[#101c33] px-3 py-2 text-[0.65rem] font-black uppercase tracking-wide text-white transition hover:bg-[#1b2a48] sm:px-5 sm:text-xs"
                >
                  Log In
                </button>
              </>
            ) : (
              /* Reserves roughly the guest row's width (Sign Up / Log In, plus
                 Play Demo when enabled) so the brand mark does not jump when auth hydrates. */
              <span className="inline-block h-9 w-[13rem] max-w-[60vw]" aria-hidden />
            )}
          </div>
        </div>
      </div>

      {/* On an account page the lobby strip collapses on phones and comes back
          from sm: up. Hidden by CSS rather than unmounted, so desktop renders
          exactly as before and the markup does not differ between the server
          and client render. */}
      <div className={hideLobbyNav ? HIDE_ON_MOBILE : undefined}>
        <CategoryNav active={active} />
      </div>
    </header>
  );
}
