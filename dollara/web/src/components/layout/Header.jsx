'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  Trophy,
  Dices,
  Cherry,
  Gamepad2,
  Gift,
  Ticket,
  Rocket,
  CircleDot,
  WalletCards,
  Diamond,
  Crown,
  Coins,
  Spade,
  Tv,
  HeartHandshake,
  Settings,
  Search,
  Download,
  Wallet,
  Plus,
  Sparkles,
  User,
  Play,
  Loader2,
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useDemoLogin } from '@/hooks/useDemoLogin';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { ThemeToggleButton } from '@/components/ThemeToggle';
import { UserAuthActions } from '@/components/UserAuthActions';
import { GetAppModal } from '@/components/GetAppModal';
import { useAuthStore } from '@/store/auth';

const PRIMARY = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Sports', href: NAV_GAME_LINKS.sports, icon: Trophy },
  { label: 'Casino', href: NAV_GAME_LINKS.casino, icon: Dices },
  { label: 'Slots', href: NAV_GAME_LINKS.slots, icon: Cherry },
  { label: 'Fantasy', href: NAV_GAME_LINKS.fantasy, icon: Gamepad2 },
];

// Specific table/live games map to their broad category route plus a name
// filter (?q=), so the destination page shows that game rather than the whole
// live-casino catalog. Icons stay monochrome (no per-item color) so the whole
// rail reads as one uniform set.
const CATEGORIES = [
  { label: 'Lottery', href: NAV_GAME_LINKS.lottery, icon: Ticket },
  { label: 'Crash', href: NAV_GAME_LINKS.crash, icon: Rocket },
  { label: 'Roulette', href: `${NAV_GAME_LINKS.liveCasino}?q=roulette`, icon: CircleDot },
  { label: 'Blackjack', href: `${NAV_GAME_LINKS.liveCasino}?q=blackjack`, icon: WalletCards },
  { label: 'Baccarat', href: `${NAV_GAME_LINKS.liveCasino}?q=baccarat`, icon: Diamond },
  { label: 'Dragon', href: `${NAV_GAME_LINKS.slots}?q=dragon`, icon: Crown },
  { label: 'Teen Patti', href: `${NAV_GAME_LINKS.liveCasino}?q=teen`, icon: Coins },
  { label: 'Poker', href: `${NAV_GAME_LINKS.liveCasino}?q=poker`, icon: Spade },
  { label: 'Shows', href: `${NAV_GAME_LINKS.liveCasino}?q=show`, icon: Tv },
  { label: 'Andar', href: `${NAV_GAME_LINKS.liveCasino}?q=andar`, icon: HeartHandshake },
];

const MOBILE_TABS_BASE = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Casino', href: NAV_GAME_LINKS.casino, icon: Dices },
  { label: 'Sports', href: NAV_GAME_LINKS.sports, icon: Trophy },
  { label: 'Promos', href: '/promotions', icon: Gift },
];

function RailItem({ item }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className="group flex flex-col items-center gap-1 rounded-xl py-2 text-muted transition-colors hover:bg-hairline/[0.04] hover:text-app-fg"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-transparent transition group-hover:border-hairline/10 group-hover:bg-panel">
        <Icon className={`h-[18px] w-[18px] ${item.color ?? ''}`} />
      </span>
      <span className="text-[0.55rem] font-semibold tracking-wide">{item.label}</span>
    </Link>
  );
}

export function Header() {
  const branding = useBranding();
  const brandName = branding.product_name;
  const token = useAuthStore((s) => s.token);
  const wallet = useAuthStore((s) => s.wallet);
  const { tryDemo, demoLoading } = useDemoLogin({ redirectTo: '/' });
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [getAppOpen, setGetAppOpen] = useState(false);
  // Whether the user has typed in the box. Lets us seed the input from the URL
  // (e.g. a shared /?q=… link) without that programmatic value triggering a
  // navigation back to the home page.
  const searchTouched = useRef(false);

  // Seed the box from the current URL query once on mount.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q') ?? '';
    if (q) setSearch(q);
  }, []);

  // Debounced navigation: push the query into the home page via ?q= so results
  // render there. Keyed on `search` only (not pathname) so navigating elsewhere
  // with a term still in the box doesn't bounce the user back to the results.
  useEffect(() => {
    if (!searchTouched.current) return undefined;
    const timer = setTimeout(() => {
      const term = search.trim();
      const onHome = window.location.pathname === '/';
      const target = term ? `/?q=${encodeURIComponent(term)}` : '/';
      if (onHome) router.replace(target);
      else if (term) router.push(target);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, router]);
  const mobileTabs = [
    ...MOBILE_TABS_BASE,
    { label: 'Account', href: token ? '/profile' : '/login', icon: User },
  ];
  // Show the player's real balance, NOT `available`. A pending withdrawal only
  // holds funds — nothing is debited until an admin approves it — so netting the
  // hold off here made the pill read ₹0.00 and look like the money was already
  // taken. The hold is called out in the tooltip and on the wallet page instead.
  const balance = wallet?.main ?? wallet?.real ?? 0;
  const heldForWithdrawal = wallet?.pendingWithdrawal ?? wallet?.locked ?? 0;
  return (
    <>
      {/* ===== Desktop: full-height side rail (crosses under navbar) ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[92px] flex-col border-r border-hairline/[0.06] bg-rail/90 backdrop-blur-xl lg:flex">
        <Link
          href="/"
          title={brandName}
          className="flex h-16 shrink-0 items-center justify-center border-b border-hairline/[0.06]"
        >
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={brandName} className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <span className="relative grid h-10 w-10 place-items-center">
              <span
                className="absolute inset-0 rounded-xl blur-[6px] opacity-60"
                style={{ backgroundColor: branding.theme_color }}
              />
              <span
                className="relative grid h-10 w-10 place-items-center rounded-xl shadow-glow"
                style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
              >
                <Sparkles className="h-4 w-4 text-surface-950" strokeWidth={2.5} />
              </span>
            </span>
          )}
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3 pt-3 scrollbar-hide">
          {PRIMARY.map((item) => (
            <RailItem key={item.label} item={item} />
          ))}
          <div className="mx-3 my-2 border-t border-hairline/[0.06]" />
          {CATEGORIES.map((item) => (
            <RailItem key={item.label} item={item} />
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-hairline/[0.06] px-2 py-3">
          <RailItem item={{ label: 'Settings', href: token ? '/settings' : '/login', icon: Settings }} />
        </div>
      </aside>

      {/* Where the side rail's edge crosses the top bar's edge */}
      {/* <span className="pointer-events-none fixed left-[92px] top-16 z-50 hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 lg:block">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-hairline/25" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-hairline/25" />
      </span> */}

      {/* ===== Top bar: starts after side rail on desktop ===== */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-2 border-b border-hairline/[0.06] bg-panel-strong/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:left-[92px]">
        {/* Brand: logo + name on mobile; name only on desktop (logo lives in side rail) */}
        <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={brandName} className="h-9 w-9 shrink-0 rounded-xl object-contain" />
          ) : (
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-glow"
              style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
            >
              <Sparkles className="h-4 w-4 text-surface-950" strokeWidth={2.5} />
            </span>
          )}
          <span className="truncate font-display text-base font-extrabold text-app-fg sm:text-lg">{brandName}</span>
        </Link>
        <Link href="/" className="hidden shrink-0 font-display text-lg font-extrabold text-app-fg lg:block">
          {brandName}
        </Link>

        {/* Search — flows between brand and actions so it never overlaps them.
            Shrinks with the viewport and drops out entirely on small screens. */}
        <div className="mx-auto hidden min-w-0 max-w-md flex-1 md:block">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => {
                searchTouched.current = true;
                setSearch(e.target.value);
              }}
              placeholder="Search 2,000+ games, sports & providers…"
              className="w-full rounded-xl border border-hairline/10 bg-rail/60 py-2.5 pl-10 pr-4 text-sm text-app-fg placeholder-muted/70 transition-colors focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          <ThemeToggleButton className="border-hairline/10 bg-panel/60" />

          {/* Get the app — always available, signed in or not. Opens the
              cross-platform install popup: a one-tap native install on Android /
              desktop Chrome, and Add-to-Home-Screen steps on iOS. Icon-only on
              narrow screens so it never crowds out the wallet pill. */}
          <button
            type="button"
            onClick={() => setGetAppOpen(true)}
            title="Get the app"
            className="inline-flex items-center gap-2 rounded-xl border border-hairline/10 px-2.5 py-2 text-xs font-bold text-app-fg transition hover:border-brand-400/50 hover:bg-panel sm:px-4"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Get the app</span>
          </button>

          {/* Play Demo — reachable at every width. Icon-only on narrow screens
              (the same shape as "Get the app" above) so phones keep the action
              instead of dropping it out of the bar. */}
          {!token && (
            <button
              type="button"
              onClick={tryDemo}
              disabled={demoLoading}
              title="Play Demo"
              aria-label="Play Demo"
              className="inline-flex items-center gap-2 rounded-xl border border-hairline/10 px-2.5 py-2 text-xs font-bold text-app-fg transition hover:border-brand-400/50 hover:bg-panel disabled:opacity-60 xl:px-4"
            >
              {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span className="hidden xl:inline">{demoLoading ? 'Starting…' : 'Play Demo'}</span>
            </button>
          )}

          {/* Wallet / balance pill — body opens the wallet page, the + opens deposit */}
          <div className="hidden items-center gap-2 rounded-full border border-hairline/10 bg-panel/60 py-1 pl-3 pr-1 md:flex">
            <Link
              href={token ? '/wallet' : '/login'}
              className="flex items-center gap-2"
              title={
                !token
                  ? 'Sign in'
                  : heldForWithdrawal > 0
                    ? `View wallet — ₹${Number(heldForWithdrawal).toLocaleString('en-IN')} on hold for a pending withdrawal`
                    : 'View wallet'
              }
            >
              <Wallet className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-bold text-app-fg">
                ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Link>
            <Link
              href={token ? '/deposit' : '/login'}
              className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-surface-950 transition hover:brightness-110"
              title="Deposit"
              aria-label="Deposit"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </Link>
          </div>

          <UserAuthActions />
        </div>
      </header>

      {/* ===== Mobile: fixed bottom tab bar ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-hairline/[0.06] bg-rail/90 backdrop-blur-xl lg:hidden">
        {mobileTabs.map((item, i) => {
          const Icon = item.icon;
          const isCenter = i === 2;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-muted transition-colors hover:text-app-fg"
            >
              <span
                className={
                  isCenter
                    ? 'grid h-10 w-10 -translate-y-3 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-surface-950 shadow-glow'
                    : 'grid h-6 w-6 place-items-center'
                }
              >
                <Icon className={isCenter ? 'h-5 w-5' : 'h-5 w-5'} />
              </span>
              <span className={`text-[0.6rem] font-semibold ${isCenter ? '-mt-2' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <GetAppModal open={getAppOpen} onClose={() => setGetAppOpen(false)} />
    </>
  );
}
