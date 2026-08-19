'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Dice5,
  FileText,
  KeyRound,
  LayoutGrid,
  LogOut,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import { useAgent } from '../../../context/AgentContext';
import { confirmDialog } from '../../../lib/toast';
import { money } from '../../../lib/format';

const NAV = [
  { label: 'Home', href: '/dashboard', icon: LayoutGrid },
  { label: 'Sport Analysis', href: '/sport-analysis', icon: Dice5 },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Players', href: '/players', icon: User },
];

// Order matches the panel's own Reports menu.
const REPORTS = [
  { label: 'P&L Report by Market', href: '/reports/pl-market' },
  { label: 'P&L Report by Agent', href: '/reports/pl-agent' },
  { label: 'Bet List', href: '/reports/bet-list' },
  { label: 'Transfer Statement', href: '/reports/transfer-statement' },
  { label: 'Settlement Report', href: '/reports/settlement' },
  { label: 'Transactions Report', href: '/reports/transactions' },
  { label: 'Event P&L report', href: '/reports/event-pl' },
  { label: 'Real Revenue Report', href: '/reports/real-revenue' },
];

/** Close a dropdown on an outside click or Escape. */
function useDismiss(ref, onDismiss) {
  useEffect(() => {
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onDismiss();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, onDismiss]);
}

export default function TopNav() {
  const pathname = usePathname();
  const { me, logout } = useAgent();
  const [reportsOpen, setReportsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const reportsRef = useRef(null);
  const accountRef = useRef(null);

  useDismiss(reportsRef, () => setReportsOpen(false));
  useDismiss(accountRef, () => setAccountOpen(false));

  // Navigating is the natural time to close a menu; without this the panel
  // keeps it open over the page the click just loaded.
  useEffect(() => {
    setReportsOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const ok = await confirmDialog({
      title: 'Sign out?',
      text: 'You will need to sign in again to reach your panel.',
      confirmText: 'Sign out',
    });
    if (ok) logout();
  };

  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);
  const reportsActive = pathname?.startsWith('/reports');

  const linkClass = (active) =>
    `flex items-center gap-2 rounded px-3 py-2 text-[15px] transition ${
      active ? 'text-white' : 'text-ink-muted hover:text-white'
    }`;

  return (
    <header className="relative bg-shell-nav">
      <div className="flex h-[68px] items-center px-4 sm:px-6">
        {/* The nav is centred in the bar, so the account menu is positioned
            absolutely rather than laid out beside it — otherwise its width
            pushes the links off-centre. */}
        <nav className="mx-auto flex flex-wrap items-center justify-center gap-1 sm:gap-3">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(isActive(href))}>
              <Icon className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}

          <div className="relative" ref={reportsRef}>
            <button
              type="button"
              onClick={() => setReportsOpen((open) => !open)}
              aria-expanded={reportsOpen}
              aria-haspopup="menu"
              className={linkClass(reportsActive)}
            >
              <FileText className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Reports</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${reportsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {reportsOpen && (
              <div
                role="menu"
                className="absolute left-1/2 z-40 mt-1 w-64 -translate-x-1/2 rounded border border-hairline bg-panel py-2 shadow-menu"
              >
                {REPORTS.map(({ label, href }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className={`flex items-center gap-2 px-4 py-2 text-sm transition hover:bg-panel-hover ${
                        active ? 'text-blue-400' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 ${
                          active ? 'text-amber-400' : 'text-ink-faint'
                        }`}
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="absolute right-4 sm:right-6" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-400/80 text-slate-900 transition hover:bg-slate-300"
          >
            <User className="h-5 w-5" />
          </button>

          {accountOpen && (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-60 rounded border border-hairline bg-panel py-2 shadow-menu"
            >
              <div className="border-b border-hairline px-4 pb-3">
                <p className="truncate text-sm font-semibold text-ink">
                  {me?.username ?? 'Loading…'}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {me?.levelLabel ?? '—'}
                </p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-faint">Balance</dt>
                    <dd className="tabular-nums text-ink">{money(me?.balance)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-faint">Available Credit</dt>
                    <dd className="tabular-nums text-up">
                      {money(me?.availableCredit)}
                    </dd>
                  </div>
                </dl>
              </div>

              <Link
                href="/profile"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-muted transition hover:bg-panel-hover hover:text-ink"
              >
                <UserCog className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/profile#password"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-muted transition hover:bg-panel-hover hover:text-ink"
              >
                <KeyRound className="h-4 w-4" />
                Change Password
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-muted transition hover:bg-panel-hover hover:text-down"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
