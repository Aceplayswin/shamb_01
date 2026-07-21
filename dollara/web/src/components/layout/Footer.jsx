'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useAuthStore } from '@/store/auth';

const LINK_GROUPS = [
  { title: 'Play', links: ['Sports', 'Live Casino', 'Slots', 'Crash Games', 'Lottery'] },
  { title: 'Account', links: ['Deposit', 'Withdraw', 'My Bets', 'Bonuses', 'KYC'] },
  { title: 'Company', links: ['About', 'Affiliates', 'Blog', 'Careers', 'Contact'] },
  { title: 'Legal', links: ['Terms', 'Privacy', 'Responsible Gaming', 'Fairness'] },
];

const PAYMENTS = ['UPI', 'GPay', 'PhonePe', 'Paytm', 'Visa', 'Mastercard', 'Rupay', 'Net Banking'];

export function Footer() {
  const branding = useBranding();
  const brandName = branding.product_name;
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isLoggedIn = isHydrated && Boolean(token);

  if (isLoggedIn) {
    return (
      <footer className="mt-8 px-4 pb-4 xl:px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline/[0.06] py-5 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-7 w-7 place-items-center rounded-lg text-surface-950"
                style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
              >
                <span className="font-display text-xs font-black">
                  {brandName.charAt(0).toUpperCase()}
                </span>
              </span>
              <span className="text-xs text-muted">© 2026 {brandName}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
              <span className="rounded border border-hairline/10 px-1.5 py-0.5 text-red-400">18+</span>
              <span>Play responsibly</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-16 px-4 xl:px-6">
      <div className="mx-auto max-w-[1400px]">
        {/* Payments marquee */}
        <div className="flex items-center gap-4 overflow-hidden rounded-2xl border border-hairline/[0.06] bg-panel-strong/60 px-4 py-3">
          <span className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Instant & secure
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap">
              {[0, 1].map((dup) => (
                <span key={dup} className="flex items-center gap-8">
                  {PAYMENTS.map((p) => (
                    <span key={p} className="font-display text-sm font-bold text-muted">{p}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Link strip */}
        <div className="mt-10 grid grid-cols-2 gap-8 border-t border-hairline/[0.06] pt-10 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand + support — spans wider */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl text-surface-950 shadow-glow"
                style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
              >
                <span className="font-display text-sm font-black">
                  {brandName.charAt(0).toUpperCase()}
                </span>
              </span>
              <span className="font-display text-xl font-extrabold text-app-fg">{brandName}</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              The premier platform for live, uninterrupted betting across Cricket, Soccer, Aviator, Andar Bahar and 2,000+ games.
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-app-fg">{group.title}</h3>
              <ul className="space-y-2.5 text-sm">
                {group.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-muted transition-colors hover:text-brand-400">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Slim legal bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-hairline/[0.06] py-6 sm:flex-row">
          <div className="flex items-center gap-3 text-[11px] font-semibold text-muted/80">
            <span className="rounded-md border border-hairline/10 bg-panel px-2 py-1 text-red-400">18+</span>
            <span>© 2026 {brandName}. All rights reserved.</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-400/80">
            Play responsibly · Gambling can be addictive
          </p>
        </div>
      </div>
    </footer>
  );
}
