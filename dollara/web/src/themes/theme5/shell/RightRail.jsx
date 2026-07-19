'use client';

// Theme5 right rail — MY PROFILE (account overview + balances), RECENT BIG WINS
// (the real public /games/big-wins feed, names masked server-side) and the
// Download App card.
//
// Balance tiles map onto the balances the shared wallet API actually returns
// (real / bonus / locked / total) — there is no casino-vs-sports bonus split in
// the wallet, so the four tiles show the real breakdown rather than inventing one.

import { useEffect } from 'react';
import Link from 'next/link';
import { Smartphone, Trophy, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useBigWins } from '@/components/BigWins';
import { T5PanelHead } from '../components/ui';
import { useAuthModal } from './authModalContext';

const inr = (n) =>
  `₹ ${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function BalanceTile({ label, value, strong = false }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${strong ? 'border-[#1d4ed8]/25 bg-[#eff4ff]' : 'border-black/[0.07] bg-[#f6f8fa]'}`}>
      <p className="text-[0.55rem] font-black uppercase tracking-[0.12em] text-[#94a3b8]">{label}</p>
      <p className={`mt-1 text-sm font-black ${strong ? 'text-[#1d4ed8]' : 'text-[#0f1b33]'}`}>{inr(value)}</p>
    </div>
  );
}

function ProfilePanel() {
  const { token, user, wallet, isHydrated, refreshSession, logout } = useAuthStore();
  const { open } = useAuthModal();

  useEffect(() => {
    if (token) refreshSession();
  }, [token, refreshSession]);

  if (!isHydrated) {
    return <div className="h-64 rounded-xl bg-white shadow-sm" aria-hidden />;
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <T5PanelHead>My Profile</T5PanelHead>

      {token ? (
        <div className="p-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#eef2f7] text-[#8fa3bd]">
            <User className="h-8 w-8" />
          </span>
          <p className="mt-2 truncate font-display text-lg font-black uppercase text-[#0f1b33]">
            {user?.full_name || user?.username || 'Player'}
          </p>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#94a3b8]">Account Overview</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <BalanceTile label="Real Balance" value={wallet?.real ?? wallet?.main} strong />
            <BalanceTile label="Bonus" value={wallet?.bonus} />
            <BalanceTile label="Locked" value={wallet?.locked} />
            <BalanceTile label="Total Balance" value={wallet?.total} strong />
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-lg border border-black/[0.12] py-2.5 text-xs font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#f4547a] hover:text-[#f4547a]"
          >
            Log Out
          </button>
        </div>
      ) : (
        <div className="p-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#eef2f7] text-[#8fa3bd]">
            <User className="h-8 w-8" />
          </span>
          <p className="mt-2 font-display text-base font-black uppercase text-[#0f1b33]">Welcome</p>
          <p className="mt-1 text-xs text-[#64748b]">Sign in to see your balance and bonuses.</p>
          <button
            type="button"
            onClick={() => open('login')}
            className="mt-4 w-full rounded-lg bg-[#101c33] py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#1b2a48]"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => open('register')}
            className="mt-2 w-full rounded-lg border border-black/[0.12] py-2.5 text-xs font-black uppercase tracking-wide text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
          >
            Create Account
          </button>
        </div>
      )}
    </section>
  );
}

function BigWinsPanel() {
  const { wins, loading } = useBigWins(10);

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <T5PanelHead icon="🏆">Recent Big Wins</T5PanelHead>
      <ul className="divide-y divide-black/[0.05]">
        {loading &&
          [0, 1, 2, 3].map((i) => <li key={i} className="h-14 animate-pulse bg-[#f6f8fa]" />)}

        {!loading && wins.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-[#94a3b8]">No big wins yet today.</li>
        )}

        {wins.map((w) => (
          <li key={w.id} className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef2f7]">
              {w.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <Trophy className="h-4 w-4 text-[#8fa3bd]" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black text-[#0f1b33]">{w.username}</span>
              <span className="block truncate text-[0.65rem] text-[#94a3b8]">{w.game_name}</span>
            </span>
            <span className="shrink-0 text-xs font-black text-[#0f1b33]">
              ₹{Number(w.win_amount ?? 0).toLocaleString('en-IN')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DownloadPanel() {
  return (
    <section className="overflow-hidden rounded-xl bg-[#101c33] p-4 text-center shadow-sm">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
        <Smartphone className="h-6 w-6" />
      </span>
      <p className="mt-3 font-display text-lg font-black uppercase tracking-wide text-white">Download App</p>
      <p className="mt-1 text-[0.7rem] text-white/60">Get the ultimate betting experience on your mobile</p>
      <Link
        href="/app"
        className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-white/10 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/20"
      >
        Download <span className="text-[0.65rem] font-bold text-white/60">apk</span>
      </Link>
    </section>
  );
}

export function Theme5RightRail() {
  return (
    // Pinned under the sticky header while the centre column scrolls (as in the
    // reference); scrolls internally if the rail is taller than the viewport.
    <aside className="sticky top-[150px] hidden max-h-[calc(100vh-166px)] w-[340px] shrink-0 space-y-4 overflow-y-auto scrollbar-hide xl:block">
      <ProfilePanel />
      <BigWinsPanel />
      <DownloadPanel />
    </aside>
  );
}
