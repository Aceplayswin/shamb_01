'use client';

import Link from 'next/link';
import { Menu, Search, Bell, Wallet } from 'lucide-react';
import Swal from 'sweetalert2';

const stub = (label, text) =>
  Swal.fire({ title: label, text, icon: 'info', timer: 1100, showConfirmButton: false, confirmButtonColor: '#F5C542' });

export function Theme2TopBar({ onMenu }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[#0d1420]/90 px-4 backdrop-blur-xl">
      {/* Mobile menu */}
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/5 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative hidden flex-1 sm:block sm:max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Search games"
          className="w-full rounded-full border border-white/5 bg-[#0a101a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400/50"
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Balance + Deposit */}
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-[#0a101a] py-1 pl-3 pr-1">
          <Wallet className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-white">$0.00</span>
          <button
            onClick={() => stub('Deposit', 'Add funds via crypto, UPI, cards or wallets.')}
            className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-1.5 text-xs font-bold text-black transition hover:from-amber-300 hover:to-amber-500"
          >
            Deposit
          </button>
        </div>

        {/* Notifications */}
        <button
          onClick={() => stub('Notifications', 'You have no new notifications.')}
          className="relative grid h-9 w-9 place-items-center rounded-full border border-white/5 bg-[#0a101a] text-slate-300 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />
        </button>

        {/* Avatar / account */}
        <Link
          href="/login"
          className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white"
          title="Account"
        >
          P
        </Link>
      </div>
    </header>
  );
}
