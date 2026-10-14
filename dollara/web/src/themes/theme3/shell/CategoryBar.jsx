'use client';

// Theme3 secondary category pill bar (LOTTERY · CRASH GAMES · ROULETTE · …). A
// horizontally scrollable strip that links into the game category / play routes.

import Link from 'next/link';
import {
  Ticket, Rocket, CircleDot, Spade, Gem, Cat, IdCard, Diamond, Tv, Layers,
} from 'lucide-react';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';

// Most map to real category routes; a few niche table games fall back to the
// live-casino lobby so every pill lands somewhere sensible.
const CATS = [
  { label: 'LOTTERY', href: NAV_GAME_LINKS.lottery, Icon: Ticket },
  { label: 'CRASH GAMES', href: NAV_GAME_LINKS.crash, Icon: Rocket },
  { label: 'ROULETTE', href: NAV_GAME_LINKS.liveCasino, Icon: CircleDot },
  { label: 'BLACKJACK', href: NAV_GAME_LINKS.liveCasino, Icon: Spade },
  { label: 'BACCARAT', href: NAV_GAME_LINKS.liveCasino, Icon: Gem },
  { label: 'DRAGON TIGER', href: NAV_GAME_LINKS.liveCasino, Icon: Cat },
  { label: 'TEEN PATTI', href: NAV_GAME_LINKS.liveCasino, Icon: IdCard },
  { label: 'POKER', href: NAV_GAME_LINKS.liveCasino, Icon: Diamond },
  { label: 'GAME SHOWS', href: NAV_GAME_LINKS.liveCasino, Icon: Tv },
  { label: 'ANDAR BAHAR', href: NAV_GAME_LINKS.liveCasino, Icon: Layers },
];

export function Theme3CategoryBar() {
  return (
    <div className="px-3 pt-2 sm:px-5">
      <div className="mx-auto max-w-[1500px] rounded-2xl border border-black/[0.06] bg-white/70 px-2 py-1.5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {CATS.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[0.7rem] font-black tracking-wide text-[#4a4458] transition hover:bg-[#f3ead4] hover:text-[#9a7a24]"
            >
              <Icon className="h-3.5 w-3.5 text-[#c79a3b]" /> {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
