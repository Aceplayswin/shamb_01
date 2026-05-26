'use client';

import Link from 'next/link';
import {
  Diamond,
  Settings,
  Menu,
  Gamepad2,
  Ticket,
  Rocket,
  CircleDot,
  Coins,
  Crown,
  HeartHandshake,
  Spade,
  Tv,
  WalletCards,
} from 'lucide-react';
import Swal from 'sweetalert2';

const TOP_NAV = [
  { href: '#', label: 'SPORTS' },
  { href: '#', label: 'CASINO' },
  { href: '#', label: 'SLOTS' },
  { href: '#', label: 'FANTASY GAMES' },
  { href: '#', label: 'PROMOTIONS' },
];

const SUB_NAV = [
  { href: '#', label: 'LOTTERY', icon: <Ticket className="h-4 w-4 text-pink-500" /> },
  { href: '#', label: 'CRASH GAMES', icon: <Rocket className="h-4 w-4 text-orange-500" /> },
  { href: '#', label: 'ROULETTE', icon: <CircleDot className="h-4 w-4 text-red-500" /> },
  { href: '#', label: 'BLACKJACK', icon: <WalletCards className="h-4 w-4 text-slate-300" /> },
  { href: '#', label: 'BACCARAT', icon: <Diamond className="h-4 w-4 text-blue-400" /> },
  { href: '#', label: 'DRAGON TIGER', icon: <Crown className="h-4 w-4 text-yellow-500" /> },
  { href: '#', label: 'TEEN PATTI', icon: <Coins className="h-4 w-4 text-red-600" /> },
  { href: '#', label: 'POKER', icon: <Spade className="h-4 w-4 text-slate-400" /> },
  { href: '#', label: 'GAME SHOWS', icon: <Tv className="h-4 w-4 text-gray-300" /> },
  { href: '#', label: 'ANDAR BAHAR', icon: <HeartHandshake className="h-4 w-4 text-red-400" /> },
];

export function Header() {
  const handleNavClick = (e, label) => {
    e.preventDefault();
    Swal.fire({
      title: 'Navigation',
      text: `Navigating to ${label}...`,
      icon: 'info',
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#ff9800',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleDemoPlay = () => {
    Swal.fire({
      title: 'Demo Play',
      text: 'Initializing demo account with virtual funds...',
      icon: 'success',
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#ff9800',
    });
  };

  return (
    <header className="sticky top-0 z-50 flex flex-col bg-surface-900 border-b border-surface-700">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 xl:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1">
            {/* Placeholder logo matching DOLLARA style */}
            <div className="flex flex-col items-start leading-none tracking-tighter">
              <span className="text-2xl font-black italic text-brand-500">DOLLARA</span>
              <span className="text-[0.5rem] uppercase text-slate-400 tracking-widest mt-0.5">Play. Win. Repeat.</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-300">
            {TOP_NAV.map((item) => (
              <a 
                key={item.label} 
                href={item.href} 
                onClick={(e) => handleNavClick(e, item.label)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleDemoPlay}
            className="hidden sm:flex items-center gap-2 rounded border border-surface-600 px-4 py-2 text-xs font-bold text-white hover:bg-surface-800 transition"
          >
            <Diamond className="h-3.5 w-3.5 text-slate-300" />
            DEMO PLAY
          </button>
          <Link
            href="/login"
            className="hidden sm:inline-flex rounded border border-surface-600 px-6 py-2 text-xs font-bold text-white hover:bg-surface-800 transition"
          >
            LOG IN
          </Link>
          <button
            onClick={(e) => handleNavClick(e, 'Register')}
            className="rounded bg-brand-500 px-6 py-2 text-xs font-bold text-surface-900 hover:bg-brand-400 transition"
          >
            REGISTER
          </button>
          <button className="rounded p-2 text-slate-300 hover:bg-surface-800 hover:text-brand-500 transition border border-surface-600/50">
            <Settings className="h-5 w-5" />
          </button>
          <button className="rounded p-2 text-slate-300 hover:bg-surface-800 transition border border-surface-600/50">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="border-t border-surface-700 bg-surface-900/50">
        <div className="mx-auto flex gap-6 overflow-x-auto px-4 py-3 xl:px-6 scrollbar-hide">
          {SUB_NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.label)}
              className="flex whitespace-nowrap items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wide cursor-pointer"
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
