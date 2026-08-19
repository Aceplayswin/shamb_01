'use client';

import Link from 'next/link';
import {
  Home, Dices, Trophy, Tv, Gift, Crown, Medal, Ticket, LifeBuoy,
} from 'lucide-react';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { useBranding } from '@/hooks/useBranding';

const NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Casino', href: NAV_GAME_LINKS.casino, icon: Dices },
  { label: 'Sports', href: NAV_GAME_LINKS.sports, icon: Trophy },
  { label: 'Live Casino', href: NAV_GAME_LINKS.liveCasino, icon: Tv },
  { label: 'Slots', href: NAV_GAME_LINKS.slots, icon: Gift },
  { label: 'Crash', href: NAV_GAME_LINKS.crash, icon: Crown },
  { label: 'Lottery', href: NAV_GAME_LINKS.lottery, icon: Ticket },
  { label: 'Fantasy', href: NAV_GAME_LINKS.fantasy, icon: Medal },
  { label: 'Support', href: '/support/chat', icon: LifeBuoy },
];

export function Theme2Sidebar({ open, onClose }) {
  const branding = useBranding();
  const brandName = branding.product_name || 'WAXCASINO';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[220px] transform border-r border-white/5 bg-[#0d1420] transition-transform duration-200 lg:z-30 lg:w-[88px] lg:translate-x-0 lg:hover:w-[220px] ${
          open ? 'translate-x-0' : '-translate-x-full'
        } group/sidebar`}
      >
        {/* Brand */}
        <Link href="/" title={brandName} className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={brandName} className="h-9 w-9 shrink-0 rounded-full object-contain" />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-[0_0_18px_-4px_rgba(245,197,66,0.8)]">
              <Dices className="h-5 w-5" strokeWidth={2.5} />
            </span>
          )}
          <span className="whitespace-nowrap font-display text-base font-black leading-none text-white lg:opacity-0 lg:transition-opacity group-hover/sidebar:lg:opacity-100">
            {branding.product_name ? (
              brandName
            ) : (
              <>
                WAX<span className="text-amber-400">CASINO</span>
              </>
            )}
            <span className="block text-[0.55rem] font-bold tracking-[0.3em] text-amber-400/70">WIN BIG</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="space-y-1 px-3 py-4">
          {NAV.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                title={label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-white ${
                  label === 'Home' ? 'bg-amber-500/10 text-amber-400' : ''
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap lg:opacity-0 lg:transition-opacity group-hover/sidebar:lg:opacity-100">
                  {label}
                </span>
              </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
