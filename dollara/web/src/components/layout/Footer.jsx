'use client';

import Link from 'next/link';
import { Download, ShieldCheck, ArrowRight, Headset } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

const LINK_GROUPS = [
  { title: 'Play', links: ['Sports', 'Live Casino', 'Slots', 'Crash Games', 'Lottery'] },
  { title: 'Account', links: ['Deposit', 'Withdraw', 'My Bets', 'Bonuses', 'KYC'] },
  { title: 'Company', links: ['About', 'Affiliates', 'Blog', 'Careers', 'Contact'] },
  { title: 'Legal', links: ['Terms', 'Privacy', 'Responsible Gaming', 'Fairness'] },
];

const PAYMENTS = ['UPI', 'GPay', 'PhonePe', 'Paytm', 'Visa', 'Mastercard', 'Rupay', 'Net Banking'];

export function Footer({ showCta = true }) {
  const branding = useBranding();
  const brandName = branding.product_name;
  return (
    <footer className="mt-16 px-4 xl:px-6">
      <div className="mx-auto max-w-[1400px]">
        {/* CTA band */}
        {showCta && (
          <div className="ring-grad relative overflow-hidden rounded-3xl bg-panel-strong bg-mesh-violet p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />
            <h2 className="relative font-display text-3xl font-black text-app-fg sm:text-4xl">
              Ready to <span className="text-gradient-gold">win big?</span>
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-muted">
              Join 1.2M+ players. Sign up in seconds, claim your ₹5,000 welcome bonus, and cash out in minutes.
            </p>
            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-3 text-sm font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <button className="inline-flex items-center gap-2 rounded-xl border border-hairline/15 px-6 py-3 text-sm font-bold text-app-fg transition hover:bg-hairline/[0.06]">
                <Download className="h-4 w-4" /> Get the app
              </button>
            </div>
          </div>
        )}

        {/* Payments marquee */}
        <div className="mt-8 flex items-center gap-4 overflow-hidden rounded-2xl border border-hairline/[0.06] bg-panel-strong/60 px-4 py-3">
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
            <Link
              href="/support/chat"
              className="inline-flex items-center gap-2 rounded-xl border border-hairline/10 px-4 py-2 text-xs font-bold text-app-fg transition hover:border-emerald-400/50 hover:bg-panel"
            >
              <Headset className="h-4 w-4 text-emerald-400" /> 24/7 Live support
            </Link>
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

      {/* Floating support button — sits above mobile bottom nav */}
      <a
        href="#"
        className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] shadow-[0_8px_30px_rgba(37,211,102,0.4)] transition-transform hover:scale-110 lg:bottom-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff" className="h-7 w-7">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
        </svg>
      </a>
    </footer>
  );
}
