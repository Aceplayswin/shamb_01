'use client';

// Theme4 primary nav — the dark teal category strip under the header (Home ·
// In-Play · Cricket · Soccer · Tennis · … · Casino III). Sports tabs carry the
// little red LIVE counters like the reference. Horizontally scrollable on small
// screens. Every tab lands on a real game route.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';
import { T4LiveBadge } from '../components/ui';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'In-Play', href: NAV_GAME_LINKS.sports, live: 0 },
  { label: 'Cricket', href: NAV_GAME_LINKS.sports, live: 0 },
  { label: 'Soccer', href: NAV_GAME_LINKS.sports, live: 0 },
  { label: 'Tennis', href: NAV_GAME_LINKS.sports, live: 0 },
  { label: 'Indian Poker', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Indian Poker II', href: NAV_GAME_LINKS.liveCasino },
  { label: 'RV Games', href: NAV_GAME_LINKS.crash },
  { label: 'Aviator', href: NAV_GAME_LINKS.crash, hot: true },
  { label: 'Chicken Road', href: NAV_GAME_LINKS.crash },
  { label: 'Ezugi', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Evolution', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Live Casino', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Vivo', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Betgames', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Casino III', href: NAV_GAME_LINKS.slots },
];

export function Theme4NavBar() {
  const pathname = usePathname();
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  return (
    <nav className="bg-[#0a5560] shadow-md">
      <div className="mx-auto max-w-[1200px]">
        <ul className="flex items-stretch overflow-x-auto scrollbar-hide">
          {NAV.map((item, i) => (
            <li key={item.label} className="relative shrink-0">
              {(item.live != null || item.hot) && (
                <span className="absolute -top-0 left-1/2 z-10 -translate-x-1/2">
                  {item.hot ? (
                    <span className="rounded-sm bg-[#e5342c] px-1 text-[0.5rem] font-black uppercase leading-tight text-white">
                      ✈
                    </span>
                  ) : (
                    <T4LiveBadge count={item.live} />
                  )}
                </span>
              )}
              <Link
                href={item.href}
                className={`block whitespace-nowrap px-3 pb-2 pt-3 text-xs font-bold text-white transition hover:bg-white/10 ${
                  isActive(item.href) && i === 0 ? 'bg-white/10' : ''
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
