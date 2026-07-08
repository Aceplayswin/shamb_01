'use client';

// Theme3 top navigation — a floating rounded pill bar (logo · center menu · auth
// / wallet). Log In / Sign Up open the split-panel auth modals via the shell's
// auth-modal context. When logged in we show the wallet chip + ProfileMenu.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/hooks/useBranding';
import { ProfileMenu } from '@/components/ProfileMenu';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { useAuthModal } from './authModalContext';

const NAV = [
  { label: 'HOME', href: '/' },
  { label: 'SPORTS', href: NAV_GAME_LINKS.sports },
  { label: 'CASINO', href: NAV_GAME_LINKS.casino },
  { label: 'SLOTS', href: NAV_GAME_LINKS.slots },
  { label: 'FANTASY', href: NAV_GAME_LINKS.fantasy },
  { label: 'PROMOTIONS', href: '/register' },
  { label: 'SUPPORT', href: '/support/chat' },
];

function BrandMark({ name }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#e9c56b] to-[#b8862f] text-sm font-black text-[#241b0e] shadow-[0_6px_16px_-6px_rgba(199,154,59,0.9)]">
        {(name || 'V').charAt(0).toUpperCase()}
      </span>
      <span className="hidden font-display text-base font-black tracking-tight text-[#1b1726] sm:block">
        {name || 'VELPLAY'}
      </span>
    </Link>
  );
}

export function Theme3TopNav() {
  const pathname = usePathname();
  const branding = useBranding();
  const { open } = useAuthModal();
  const [mobileOpen, setMobileOpen] = useState(false);

  const token = useAuthStore((s) => s.token);
  const wallet = useAuthStore((s) => s.wallet);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const balance = wallet?.available ?? wallet?.main ?? 0;

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <nav className="mx-auto flex max-w-[1500px] items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/85 px-4 py-2.5 shadow-[0_16px_40px_-24px_rgba(36,27,58,0.55)] backdrop-blur-xl">
        <BrandMark name={branding.product_name} />

        {/* Center menu (desktop) */}
        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`rounded-lg px-3 py-2 text-xs font-black tracking-wide transition ${
                  isActive(item.href)
                    ? 'bg-[#f3ead4] text-[#9a7a24]'
                    : 'text-[#4a4458] hover:bg-black/[0.04] hover:text-[#1b1726]'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {isHydrated && token ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-black/[0.06] bg-white py-1 pl-3 pr-1 shadow-sm sm:flex">
                <Wallet className="h-4 w-4 text-[#c79a3b]" />
                <span className="text-sm font-black text-[#1b1726]">
                  ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Link
                  href="/deposit"
                  className="rounded-full bg-gradient-to-br from-[#e9c56b] to-[#b8862f] px-4 py-1.5 text-xs font-black text-[#241b0e]"
                >
                  Deposit
                </Link>
              </div>
              <ProfileMenu variant="theme3" />
            </>
          ) : isHydrated ? (
            <>
              <button
                onClick={() => open('login')}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-black text-[#1b1726] shadow-sm transition hover:border-[#c79a3b]/50"
              >
                Log In
              </button>
              <button
                onClick={() => open('register')}
                className="rounded-xl bg-gradient-to-br from-[#e9c56b] via-[#c79a3b] to-[#b8862f] px-4 py-2 text-xs font-black text-[#241b0e] shadow-[0_8px_20px_-8px_rgba(199,154,59,0.9)] transition hover:brightness-105"
              >
                SIGN UP
              </button>
            </>
          ) : (
            <span className="inline-block h-9 w-32" aria-hidden />
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg text-[#4a4458] hover:bg-black/[0.04] lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-[1500px] rounded-2xl border border-black/[0.06] bg-white p-2 shadow-xl lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                isActive(item.href) ? 'bg-[#f3ead4] text-[#9a7a24]' : 'text-[#4a4458] hover:bg-black/[0.04]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
