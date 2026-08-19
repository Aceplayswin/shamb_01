'use client';

import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';

/**
 * Header and footer for the three public pages (landing, apply, status).
 *
 * Shared because the panel's own chrome lives behind the auth guard and cannot
 * be reused here — without this the three pages would each grow their own
 * header and drift apart on the first change to either link.
 */
export function PublicHeader({ active }) {
  const linkClass = (name) =>
    `text-sm transition ${
      active === name ? 'text-white' : 'text-ink-muted hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-shell-nav/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-white">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-bold leading-none text-ink">DOLLARA</span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-blue-400">
              Agent Network
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/apply/status" className={linkClass('status')}>
            Check Status
          </Link>
          <Link href="/login" className={linkClass('login')}>
            Sign In
          </Link>
          <Link href="/apply" className="btn-primary !px-4 !py-2">
            Apply Now
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-hairline bg-shell-foot py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-ink-muted sm:flex-row sm:px-6">
        <span>Copyright © {new Date().getFullYear()} All rights reserved.</span>
        <span className="text-ink-faint">
          Agent accounts are subject to review and approval.
        </span>
      </div>
    </footer>
  );
}
