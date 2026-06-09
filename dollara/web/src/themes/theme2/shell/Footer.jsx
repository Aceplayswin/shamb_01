'use client';

import Link from 'next/link';
import { Dices, Twitter, Send, MessageCircle, Instagram } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

const COLUMNS = [
  { title: 'Casino', links: ['All Games', 'Slots', 'Live Casino', 'Table Games', 'Jackpot Games'] },
  { title: 'Sports', links: ['Sportsbook', 'Live Betting', 'Upcoming Matches', 'Virtual Sports'] },
  { title: 'Support', links: ['Help Center', 'Live Chat', 'FAQ', 'Responsible Gaming', 'Contact Us'] },
  { title: 'Promotions', links: ['All Bonuses', 'VIP Club', 'Tournaments', 'Affiliate Program'] },
];

export function Theme2Footer() {
  const branding = useBranding();
  const name = branding.product_name || 'WAXCASINO';
  return (
    <footer className="border-t border-white/5 bg-[#0a101a] px-6 py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 lg:grid-cols-6">
          {/* Brand + socials */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black">
                <Dices className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-display text-base font-black text-white">
                {name}
                <span className="block text-[0.55rem] font-bold tracking-[0.3em] text-amber-400/70">WIN BIG</span>
              </span>
            </Link>
            <div className="mt-5 flex gap-3">
              {[Twitter, Send, MessageCircle, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:border-amber-400/50 hover:text-amber-400">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-bold text-white">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-400 transition hover:text-amber-400">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/5 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-white">Subscribe to our Newsletter</p>
            <p className="text-xs text-slate-400">Get exclusive offers and updates</p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              placeholder="Your email"
              className="w-full rounded-lg border border-white/10 bg-[#0d1420] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400/50 sm:w-64"
            />
            <button className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-2.5 text-sm font-bold text-black transition hover:from-amber-300 hover:to-amber-500">
              Subscribe
            </button>
          </form>
        </div>

        {/* Legal */}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/5 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {name}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="hover:text-amber-400">Privacy Policy</a>
            <a href="#" className="hover:text-amber-400">Terms of Service</a>
            <a href="#" className="hover:text-amber-400">AML Policy</a>
            <a href="#" className="hover:text-amber-400">Bonus Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
