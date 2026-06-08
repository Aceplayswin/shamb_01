'use client';

import Link from 'next/link';
import { Menu, Search, Wallet, Plus, Gem } from 'lucide-react';
import Swal from 'sweetalert2';
import { useBranding } from '@/hooks/useBranding';
import { ThemeToggleButton } from '@/components/ThemeToggle';

// Theme 2 — "Midnight": a horizontal top-nav layout (contrast to theme1's side rail).
const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Sports', href: '#' },
  { label: 'Casino', href: '#' },
  { label: 'Slots', href: '#' },
  { label: 'Live', href: '#' },
  { label: 'Promos', href: '#' },
];

const fire = (label) =>
  Swal.fire({ title: label, text: `Opening ${label}…`, icon: 'info', timer: 1100, showConfirmButton: false, confirmButtonColor: '#F5C542' });

export function Header() {
  const branding = useBranding();
  const brandName = branding.product_name;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-hairline/[0.08] bg-panel-strong/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 xl:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={brandName} className="h-9 w-9 rounded-xl object-contain" />
          ) : (
            <span
              className="grid h-9 w-9 place-items-center rounded-xl shadow-glow"
              style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
            >
              <Gem className="h-4 w-4 text-surface-950" strokeWidth={2.5} />
            </span>
          )}
          <span className="font-display text-lg font-extrabold tracking-tight text-app-fg">{brandName}</span>
        </Link>

        {/* Center nav (desktop) */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const onClick = (e) => {
              if (item.href === '#') { e.preventDefault(); fire(item.label); }
            };
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClick}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-app-fg/70 transition hover:bg-hairline/[0.06] hover:text-app-fg"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Search (desktop) */}
        <div className="relative ml-auto hidden w-64 xl:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search games…"
            className="w-full rounded-xl border border-hairline/10 bg-rail/60 py-2 pl-9 pr-3 text-sm text-app-fg placeholder-muted/70 focus:border-brand-400 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2.5 xl:ml-0">
          <ThemeToggleButton className="border-hairline/10 bg-panel/60" />

          <button
            onClick={() => Swal.fire({ title: 'Wallet', text: 'Add funds via UPI, cards or wallets.', icon: 'success', confirmButtonColor: '#F5C542' })}
            className="hidden items-center gap-2 rounded-full border border-hairline/10 bg-panel/60 py-1 pl-3 pr-1 md:flex"
          >
            <Wallet className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-bold text-app-fg">₹0.00</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-surface-950">
              <Plus className="h-4 w-4" strokeWidth={3} />
            </span>
          </button>

          <Link
            href="/login"
            className="hidden rounded-xl border border-hairline/10 px-4 py-2 text-xs font-bold text-app-fg transition hover:border-brand-400/50 hover:bg-panel sm:block"
          >
            LOG IN
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-xs font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500"
          >
            REGISTER
          </Link>

          <button onClick={() => fire('Menu')} className="grid h-9 w-9 place-items-center rounded-lg border border-hairline/10 text-app-fg lg:hidden">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
