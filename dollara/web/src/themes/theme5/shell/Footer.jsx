'use client';

// Theme5 footer — a deliberately short white card. Everything sits on one
// baseline row: brand + age mark + GET APP on the left, quick links and payment
// chips flowing inline to the right, then a single legal line. Kept flat rather
// than as tall stacked columns so the card costs as little vertical space as
// possible; WhatsApp support lives in the floating button (see ThemeShell).
// It renders INSIDE the centre column so the side rails flank it, which is why
// it is a plain card rather than a full-bleed band.

import Link from 'next/link';
import { Download } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { Theme5BrandMark } from './TopBar';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { InstagramIcon } from './InstagramIcon';
import { FacebookIcon } from './FacebookIcon';
import { XIcon } from './XIcon';

const SOCIAL_CHANNELS = [
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'twitter', label: 'X', Icon: XIcon },
];

function Theme5SocialIconRow({ className, itemClassName }) {
  const { links } = useSocialLinks();
  const items = SOCIAL_CHANNELS.filter((c) => links[c.key]);
  if (!items.length) return null;

  return (
    <div className={className}>
      {items.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={itemClassName}
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}

const QUICK_NAV = [
  { label: 'Live Betting', href: NAV_GAME_LINKS.sports },
  { label: 'Casino Lobby', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Promotions', href: '/promotions' },
];

const PAYMENTS = ['UPI', 'GPay', 'PhonePe', 'Net Banking', 'Paytm'];

export function Theme5Footer() {
  const branding = useBranding();
  const name = branding.product_name || 'MAHAKAL WORLD';

  return (
    <footer className="overflow-hidden rounded-xl bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {/* Same logo-then-name mark as the navbar, so an uploaded logo_url
            shows in both places instead of only in the header. */}
        <Theme5BrandMark name={name} />

        {/* Links and payment chips share the remaining width and wrap together
            instead of each owning a column that dictates the card's height. */}
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {QUICK_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-[#475569] transition hover:text-[#1d4ed8]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-1.5">
          {PAYMENTS.map((p) => (
            <span
              key={p}
              className="rounded-md bg-[#f1f5f9] px-2.5 py-1 text-[0.65rem] font-black text-[#475569]"
            >
              {p}
            </span>
          ))}
        </div>

        {/* Pushed to the far end on wide screens; wraps inline when narrow. */}
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Theme5SocialIconRow
            className="flex gap-1.5"
            itemClassName="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-[#64748b] transition hover:border-[#1d4ed8]/40 hover:text-[#1d4ed8]"
          />
          <span className="rounded-md border border-[#f4547a]/40 px-2 py-1 text-[0.6rem] font-black uppercase tracking-wide text-[#f4547a]">
            18+
          </span>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#22a34a] px-3.5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:brightness-110"
          >
            <Download className="h-3.5 w-3.5" /> Get App
          </Link>
        </div>
      </div>

      {/* ── Legal strip ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-black/[0.06] pt-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#94a3b8]">
          © {new Date().getFullYear()} {name}
        </p>
        <p className="text-[0.65rem] font-black uppercase tracking-wide text-[#1d4ed8]">
          Gambling can be addictive, please play responsibly
        </p>
      </div>
    </footer>
  );
}
