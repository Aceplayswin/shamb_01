'use client';

// Theme5 left rail — the SPORTS and CASINO GAMES link panels from the reference.
// Each row lands on a real game route. The LIVE pills are presentational markers
// on the disciplines that normally carry a live feed (the shared layer exposes no
// per-sport live state), mirroring how theme4 renders its LIVE nav badges.

import Link from 'next/link';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { T5PanelHead, T5LiveBadge } from '../components/ui';

const SPORTS = [
  { label: 'Cricket', live: true },
  { label: 'Football', live: true },
  { label: 'Tennis' },
  { label: 'Basketball' },
  { label: 'Kabaddi', live: true },
  { label: 'Volleyball' },
  { label: 'Horse Racing' },
  { label: 'Esports' },
];

const CASINO = [
  { label: 'Live Roulette', live: true },
  { label: 'Blackjack' },
  { label: 'Baccarat', live: true },
  { label: 'Teen Patti' },
  { label: 'Dragon Tiger' },
  { label: 'Andar Bahar' },
  { label: 'Sic Bo' },
  { label: 'Game Shows' },
];

function LinkPanel({ icon, title, items, href }) {
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <T5PanelHead icon={icon}>{title}</T5PanelHead>
      <ul className="px-2 py-1.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={href}
              className="group flex items-center gap-2 rounded-lg px-2.5 py-2.5 transition hover:bg-[#f1f4f8]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#cbd5e1] transition group-hover:bg-[#1d4ed8]" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#0f1b33] transition group-hover:text-[#1d4ed8]">
                {item.label}
              </span>
              {item.live && <T5LiveBadge />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Theme5Sidebar() {
  return (
    // Pinned under the sticky header while the centre column scrolls (as in the
    // reference); scrolls internally if the rail is taller than the viewport.
    <aside className="sticky top-[150px] hidden max-h-[calc(100vh-166px)] w-[280px] shrink-0 space-y-4 overflow-y-auto scrollbar-hide lg:block">
      <LinkPanel icon="⚽" title="Sports" items={SPORTS} href={NAV_GAME_LINKS.sports} />
      <LinkPanel icon="🎰" title="Casino Games" items={CASINO} href={NAV_GAME_LINKS.liveCasino} />
    </aside>
  );
}
