'use client';

import Link from 'next/link';
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
  LifeBuoy,
  Settings,
  Search,
  Wallet,
  Plus,
  Sparkles,
  User,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useBranding } from '@/hooks/useBranding';

const PRIMARY = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Sports', href: '#', icon: Trophy },
  { label: 'Casino', href: '#', icon: Dices },
  { label: 'Slots', href: '#', icon: Cherry },
  { label: 'Fantasy', href: '#', icon: Gamepad2 },
  { label: 'Promos', href: '#', icon: Gift },
];

const CATEGORIES = [
  { label: 'Lottery', href: '#', icon: Ticket, color: 'text-pink-400' },
  { label: 'Crash', href: '#', icon: Rocket, color: 'text-brand-400' },
  { label: 'Roulette', href: '#', icon: CircleDot, color: 'text-red-400' },
  { label: 'Blackjack', href: '#', icon: WalletCards, color: 'text-slate-200' },
  { label: 'Baccarat', href: '#', icon: Diamond, color: 'text-sky-400' },
  { label: 'Dragon', href: '#', icon: Crown, color: 'text-brand-300' },
  { label: 'Teen Patti', href: '#', icon: Coins, color: 'text-amber-400' },
  { label: 'Poker', href: '#', icon: Spade, color: 'text-accent-300' },
  { label: 'Shows', href: '#', icon: Tv, color: 'text-emerald-400' },
  { label: 'Andar', href: '#', icon: HeartHandshake, color: 'text-rose-400' },
];

const MOBILE_TABS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Casino', href: '#', icon: Dices },
  { label: 'Sports', href: '#', icon: Trophy },
  { label: 'Promos', href: '#', icon: Gift },
  { label: 'Account', href: '/login', icon: User },
];

const fire = (title, text, icon = 'info') =>
  Swal.fire({
    title,
    text,
    icon,
    background: '#15131f',
    color: '#fff',
    confirmButtonColor: '#ff9800',
    timer: icon === 'info' ? 1100 : undefined,
    showConfirmButton: icon !== 'info',
  });

function RailItem({ item }) {
  const Icon = item.icon;
  const onClick = (e) => {
    if (item.href === '#') {
      e.preventDefault();
      fire(item.label, `Opening ${item.label}…`);
    }
  };
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={item.label}
      className="group flex flex-col items-center gap-1 rounded-xl py-2 text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-transparent transition group-hover:border-white/10 group-hover:bg-surface-800">
        <Icon className={`h-[18px] w-[18px] ${item.color ?? ''}`} />
      </span>
      <span className="text-[0.55rem] font-semibold tracking-wide">{item.label}</span>
    </Link>
  );
}

export function Header() {
  const branding = useBranding();
  const brandName = branding.product_name;
  return (
    <>
      {/* ===== Desktop: fixed vertical side rail ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[92px] flex-col border-r border-white/[0.06] bg-surface-950/90 backdrop-blur-xl lg:flex">
        <Link href="/" title={brandName} className="flex shrink-0 items-center justify-center py-4">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={brandName} className="h-11 w-11 rounded-2xl object-contain" />
          ) : (
            <span className="relative grid h-11 w-11 place-items-center">
              <span
                className="absolute inset-0 rounded-2xl blur-[7px] opacity-60"
                style={{ backgroundColor: branding.theme_color }}
              />
              <span
                className="relative grid h-11 w-11 place-items-center rounded-2xl shadow-glow"
                style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
              >
                <Sparkles className="h-5 w-5 text-surface-950" strokeWidth={2.5} />
              </span>
            </span>
          )}
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3 scrollbar-hide">
          {PRIMARY.map((item) => (
            <RailItem key={item.label} item={item} />
          ))}
          <div className="mx-3 my-2 border-t border-white/[0.06]" />
          {CATEGORIES.map((item) => (
            <RailItem key={item.label} item={item} />
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/[0.06] px-2 py-3">
          <RailItem item={{ label: 'Support', href: '/support/chat', icon: LifeBuoy }} />
          <RailItem item={{ label: 'Settings', href: '#', icon: Settings }} />
        </div>
      </aside>

      {/* ===== Top utility bar (desktop offset by rail; full width on mobile) ===== */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-surface-900/80 px-4 backdrop-blur-xl lg:left-[92px]">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={brandName} className="h-9 w-9 rounded-xl object-contain" />
          ) : (
            <span
              className="grid h-9 w-9 place-items-center rounded-xl shadow-glow"
              style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
            >
              <Sparkles className="h-4 w-4 text-surface-950" strokeWidth={2.5} />
            </span>
          )}
          <span className="font-display text-lg font-extrabold text-white">{brandName}</span>
        </Link>

        {/* Search */}
        <div className="relative ml-auto hidden w-full max-w-md items-center sm:flex lg:ml-0">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search 2,000+ games, sports & providers…"
            className="w-full rounded-xl border border-white/10 bg-surface-950/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-brand-400 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
          {/* Live online */}
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-surface-800/60 px-3 py-1.5 xl:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-300">
              <span className="text-white">12,480</span> online
            </span>
          </span>

          {/* Wallet / balance pill */}
          <button
            onClick={() => fire('Wallet', 'Add funds via UPI, cards or wallets.', 'success')}
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-surface-800/60 py-1 pl-3 pr-1 md:flex"
          >
            <Wallet className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-bold text-white">₹0.00</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-surface-950">
              <Plus className="h-4 w-4" strokeWidth={3} />
            </span>
          </button>

          <Link
            href="/login"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-brand-400/50 hover:bg-surface-800"
          >
            LOG IN
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-xs font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500"
          >
            REGISTER
          </Link>
        </div>
      </header>

      {/* ===== Mobile: fixed bottom tab bar ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-white/[0.06] bg-surface-950/90 backdrop-blur-xl lg:hidden">
        {MOBILE_TABS.map((item, i) => {
          const Icon = item.icon;
          const isCenter = i === 2;
          const onClick = (e) => {
            if (item.href === '#') {
              e.preventDefault();
              fire(item.label, `Opening ${item.label}…`);
            }
          };
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClick}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-slate-400 transition-colors hover:text-white"
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
    </>
  );
}
