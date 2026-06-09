'use client';

import Link from 'next/link';
import {
  Home, Dices, Trophy, Tv, Gift, Crown, Medal, Ticket, Users, LifeBuoy,
} from 'lucide-react';
import Swal from 'sweetalert2';

const NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Casino', href: '#', icon: Dices },
  { label: 'Sports', href: '#', icon: Trophy },
  { label: 'Live Casino', href: '#', icon: Tv },
  { label: 'Promotions', href: '#', icon: Gift },
  { label: 'VIP Club', href: '#', icon: Crown },
  { label: 'Tournaments', href: '#', icon: Medal },
  { label: 'Lottery', href: '#', icon: Ticket },
  { label: 'Affiliate', href: '#', icon: Users },
  { label: 'Support', href: '/support/chat', icon: LifeBuoy },
];

const stub = (label) =>
  Swal.fire({ title: label, text: `Opening ${label}…`, icon: 'info', timer: 1000, showConfirmButton: false, confirmButtonColor: '#F5C542' });

export function Theme2Sidebar({ open, onClose }) {
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
        <Link href="/" className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-[0_0_18px_-4px_rgba(245,197,66,0.8)]">
            <Dices className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="whitespace-nowrap font-display text-base font-black leading-none text-white lg:opacity-0 lg:transition-opacity group-hover/sidebar:lg:opacity-100">
            WAX<span className="text-amber-400">CASINO</span>
            <span className="block text-[0.55rem] font-bold tracking-[0.3em] text-amber-400/70">WIN BIG</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="space-y-1 px-3 py-4">
          {NAV.map(({ label, href, icon: Icon }) => {
            const onClick = (e) => { if (href === '#') { e.preventDefault(); stub(label); } };
            return (
              <Link
                key={label}
                href={href}
                onClick={onClick}
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
            );
          })}
        </nav>
      </aside>
    </>
  );
}
