'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, Bell, Wallet, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuthStore } from '@/store/auth';
import { useDemoLogin } from '@/hooks/useDemoLogin';
import { ProfileMenu } from '@/components/ProfileMenu';
import { UserAuthActions } from '@/components/UserAuthActions';
import { GetAppModal } from '@/components/GetAppModal';

const stub = (label, text) =>
  Swal.fire({ title: label, text, icon: 'info', timer: 1100, showConfirmButton: false, confirmButtonColor: '#F5C542' });

export function Theme2TopBar({ onMenu }) {
  const token = useAuthStore((s) => s.token);
  const wallet = useAuthStore((s) => s.wallet);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  // Real balance, not `available` — a pending withdrawal only holds funds, it
  // does not debit them, so netting the hold off made this read ₹0.00.
  const balance = wallet?.main ?? wallet?.real ?? 0;
  const { tryDemo, demoLoading } = useDemoLogin({ redirectTo: '/' });
  const [getAppOpen, setGetAppOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[#0d1420]/90 px-4 backdrop-blur-xl">
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/5 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden flex-1 sm:block sm:max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Search games"
          className="w-full rounded-full border border-white/5 bg-[#0a101a] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400/50"
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setGetAppOpen(true)}
          title="Get the app"
          className="hidden items-center gap-2 rounded-full border border-white/5 bg-[#0a101a] px-3 py-2 text-xs font-bold text-white transition hover:border-amber-400/50 sm:inline-flex"
        >
          <Download className="h-4 w-4" />
          <span className="hidden md:inline">Get the app</span>
        </button>

        {isHydrated && !token && (
          <button
            type="button"
            onClick={tryDemo}
            disabled={demoLoading}
            className="hidden rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-amber-400/50 disabled:opacity-60 lg:inline-flex"
          >
            {demoLoading ? 'Starting…' : 'Play Demo'}
          </button>
        )}

        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-[#0a101a] py-1 pl-3 pr-1">
          <Wallet className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-white">
            ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <Link
            href={token ? '/deposit' : '/login'}
            className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-1.5 text-xs font-bold text-black transition hover:from-amber-300 hover:to-amber-500"
          >
            Deposit
          </Link>
        </div>

        <button
          onClick={() => stub('Notifications', 'You have no new notifications.')}
          className="relative grid h-9 w-9 place-items-center rounded-full border border-white/5 bg-[#0a101a] text-slate-300 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />
        </button>

        {isHydrated && token ? (
          <ProfileMenu variant="theme2" />
        ) : isHydrated ? (
          <UserAuthActions
            loginClassName="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:border-amber-400/50"
            registerClassName="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1.5 text-xs font-bold text-black"
          />
        ) : (
          <span className="inline-block h-9 w-9" aria-hidden />
        )}
      </div>

      <GetAppModal open={getAppOpen} onClose={() => setGetAppOpen(false)} />
    </header>
  );
}
