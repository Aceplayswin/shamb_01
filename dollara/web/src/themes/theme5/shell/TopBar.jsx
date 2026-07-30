'use client';

// Theme5 top chrome — three stacked strips matching the Velplay reference:
//   1. Black "LATEST NEWS" ticker (badge + marquee headlines, App / lang / Help).
//   2. White header: brand mark, icon nav, DEPOSIT + WITHDRAW, bell, account.
//   3. Light category rail of emoji shortcuts (Lottery, Crash Games, Roulette …).
//
// Guests get an account button that opens the shell's auth modal; signed-in
// players get the ProfileMenu instead.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Download } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/hooks/useBranding';
import { useDemoLogin } from '@/hooks/useDemoLogin';
import { ProfileMenu } from '@/components/ProfileMenu';
import { GetAppModal } from '@/components/GetAppModal';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { useAuthModal } from './authModalContext';

const NEWS = [
  'Weekly Cashback update version 2.0 releasing soon',
  'New Bonus System upgrade in 15 days',
  'New Live Casino Games launching in 7 days',
  'Mega Slots Tournament starts in 10 days',
];

const NAV = [
  { label: 'Home', icon: '🏠', href: '/' },
  { label: 'Sports', icon: '⚽', href: NAV_GAME_LINKS.sports },
  { label: 'Casino', icon: '🎰', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Slots', icon: '🎰', href: NAV_GAME_LINKS.slots },
  { label: 'Fantasy Games', icon: '🎮', href: NAV_GAME_LINKS.fantasy },
  { label: 'Promotions', icon: '💰', href: '/promotions' },
];

// The emoji shortcut rail under the header. Each lands on a real game route.
const CATEGORIES = [
  { label: 'Lottery', icon: '🎫', href: NAV_GAME_LINKS.lottery },
  { label: 'Crash Games', icon: '🚀', href: NAV_GAME_LINKS.crash },
  { label: 'Roulette', icon: '🎡', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Blackjack', icon: '🃏', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Baccarat', icon: '💎', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Dragon Tiger', icon: '🐯', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Teen Patti', icon: '🎴', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Poker', icon: '♠️', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Game Shows', icon: '📺', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Andar Bahar', icon: '🎲', href: NAV_GAME_LINKS.liveCasino },
];

export function Theme5BrandMark({ name, compact = false }) {
  const label = name || 'DOLLARA';
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="rounded bg-[#101c33] px-2 py-1 leading-none shadow-sm">
        <span className="block font-display text-sm font-black italic tracking-tight text-[#f5c518]">
          {label.toUpperCase()}
        </span>
        {!compact && (
          <span className="mt-0.5 block text-[0.4rem] font-bold tracking-[0.25em] text-white/70">
            PLAY · WIN · REPEAT
          </span>
        )}
      </span>
    </Link>
  );
}

function NewsTicker() {
  return (
    <div className="flex items-center gap-3 bg-[#0b0f18] px-3 py-1.5">
      <span className="shrink-0 rounded bg-white px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-wide text-[#0b0f18]">
        Latest News
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap">
          {[0, 1].map((copy) =>
            NEWS.map((n) => (
              <span key={`${copy}-${n}`} className="flex items-center gap-8">
                <span className="text-[0.7rem] font-semibold text-white/85">{n}</span>
                <span className="text-white/25">|</span>
              </span>
            )),
          )}
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-[0.7rem] font-semibold text-white/70 sm:flex">
        <span className="flex items-center gap-1">📱 App</span>
        <span className="flex items-center gap-1">🇮🇳 EN</span>
        <Link href="/support/chat" className="transition hover:text-white">
          Help
        </Link>
      </div>
    </div>
  );
}

function CategoryRail() {
  return (
    <div className="border-b border-black/[0.06] bg-[#eef1f4]">
      <div className="mx-auto max-w-[1500px] px-3">
        <ul className="flex items-start gap-1 overflow-x-auto py-2.5 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <li key={c.label} className="shrink-0">
              <Link
                href={c.href}
                className="flex w-[100px] flex-col items-center gap-1.5 rounded-lg px-2 py-1.5 transition hover:bg-white"
              >
                <span className="text-xl leading-none">{c.icon}</span>
                <span className="text-center text-[0.6rem] font-black uppercase tracking-wide text-[#0f1b33]">
                  {c.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Theme5TopBar() {
  const branding = useBranding();
  const pathname = usePathname();
  const { open } = useAuthModal();

  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { tryDemo, demoLoading } = useDemoLogin({ redirectTo: '/' });
  const [getAppOpen, setGetAppOpen] = useState(false);

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      <NewsTicker />

      {/* White nav header sitting on the blue accent rule */}
      <div className="border-b-2 border-[#1d4ed8] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-3 py-2">
          <Theme5BrandMark name={branding.product_name} />

          <nav className="min-w-0 flex-1">
            <ul className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {NAV.map((item) => (
                <li key={item.label} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-wide transition ${
                      isActive(item.href)
                        ? 'theme5-nav-active text-[#1d4ed8]'
                        : 'text-[#0f1b33] hover:text-[#1d4ed8]'
                    }`}
                  >
                    <span className="text-sm leading-none">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setGetAppOpen(true)}
              title="Get the app"
              className="hidden items-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] sm:inline-flex"
            >
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">Get the app</span>
            </button>

            {isHydrated && !token && (
              <button
                type="button"
                onClick={tryDemo}
                disabled={demoLoading}
                className="hidden rounded-lg border border-black/15 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] disabled:opacity-60 lg:inline-flex"
              >
                {demoLoading ? 'Starting…' : 'Play Demo'}
              </button>
            )}

            {isHydrated && token ? (
              <>
                <Link
                  href="/deposit"
                  className="hidden rounded-lg border border-black/15 bg-white px-5 py-2 text-xs font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] sm:block"
                >
                  Deposit
                </Link>
                <Link
                  href="/withdraw"
                  className="hidden rounded-lg bg-[#101c33] px-5 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#1b2a48] sm:block"
                >
                  Withdraw
                </Link>
                <Link
                  href="/promotions"
                  aria-label="Notifications"
                  className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                >
                  <Bell className="h-4 w-4" />
                </Link>
                <ProfileMenu variant="theme5" />
              </>
            ) : isHydrated ? (
              <>
                <button
                  type="button"
                  onClick={() => open('register')}
                  className="hidden rounded-lg border border-black/15 bg-white px-5 py-2 text-xs font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] sm:block"
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => open('login')}
                  className="rounded-lg bg-[#101c33] px-5 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#1b2a48]"
                >
                  Log In
                </button>
              </>
            ) : (
              <span className="inline-block h-9 w-40" aria-hidden />
            )}
          </div>
        </div>
      </div>

      <CategoryRail />

      <GetAppModal open={getAppOpen} onClose={() => setGetAppOpen(false)} />
    </header>
  );
}
