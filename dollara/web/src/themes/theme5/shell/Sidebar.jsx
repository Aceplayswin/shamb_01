'use client';

// Theme5 left rail — the SPORTS and CASINO GAMES link panels from the reference.
// Each row lands on a real game route. The LIVE pills on the casino rows are
// presentational markers on the tables that normally carry a live feed (the
// shared layer exposes no per-game live state), mirroring how theme4 renders
// its LIVE nav badges.

import Link from 'next/link';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { T5PanelHead, T5LiveBadge } from '../components/ui';

// Each row deep-links to its own table/provider via ?q=, the same shortcut the
// header rail uses (the games listing passes the term to the catalog search,
// which matches game name / slug / provider).
const SPORTS = [
  { label: 'Saba Sports', q: 'saba' },
  { label: 'Luck Sports', q: 'luck' },
];

const CASINO = [
  { label: 'Live Roulette', q: 'roulette', live: true },
  { label: 'Blackjack', q: 'blackjack' },
  { label: 'Baccarat', q: 'baccarat', live: true },
  { label: 'Teen Patti', q: 'teenpatti' },
  { label: 'Andar Bahar', q: 'andar+bahar' },
  { label: 'Rummy', q: 'rummy' },
  { label: 'Crazy Time', q: 'crazy+time', live: true },
  { label: 'MONOPOLY Live', q: 'monopoly', live: true },
];

function LinkPanel({ icon, title, items, href }) {
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <T5PanelHead icon={icon}>{title}</T5PanelHead>
      <ul className="px-2 py-1.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.q ? `${href}?q=${item.q}` : href}
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
    <aside className="sticky top-[150px] hidden max-h-[calc(100vh-166px)] w-[220px] shrink-0 space-y-4 overflow-y-auto scrollbar-hide lg:block">
      <LinkPanel icon="⚽" title="Sports" items={SPORTS} href={NAV_GAME_LINKS.sports} />
      <LinkPanel icon="🎰" title="Casino Games" items={CASINO} href={NAV_GAME_LINKS.liveCasino} />
    </aside>
  );
}
