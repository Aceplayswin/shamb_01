'use client';

// Theme5 shell — "VELPLAY": a light three-column portal. Distinct chrome from
// theme1-4: a white icon nav on a blue rule, an emoji category rail, then a
// three-column body — sports/casino link rail on the left,
// page content in the centre (with the footer card inside it, as in the
// reference), and the profile + big-wins + app rail on the right.
//
// Auth is presented as a compact modal owned here, so the header buttons and the
// /login + /register routes can open it (same pattern as theme3/theme4).
//
// The whole tree is scoped with `theme5-root` so the palette holds regardless of
// the app-wide light/dark toggle (mirrors theme2/3/4 scoping).

import { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Theme5TopBar } from './TopBar';
import { Theme5Sidebar } from './Sidebar';
import { Theme5RightRail } from './RightRail';
import { Theme5Footer } from './Footer';
import { Theme5AuthModals } from './AuthModals';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Theme5AuthModalContext } from './authModalContext';
import { isAccountRoute, HIDE_ON_MOBILE } from './accountRoutes';
import { useWalletSync } from '@/hooks/useWalletSync';

export default function Theme5Shell({ children }) {
  const pathname = usePathname();
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'

  const open = useCallback((mode) => setAuthMode(mode), []);
  const close = useCallback(() => setAuthMode(null), []);
  const modalValue = useMemo(() => ({ mode: authMode, open, close }), [authMode, open, close]);

  // Balances change server-side (a settled round, an approved deposit), so the
  // shell keeps them current instead of leaving a stale number on screen until
  // the next navigation. Called before the early returns below — hooks cannot
  // run conditionally.
  useWalletSync();

  // The admin console renders its own shell and must not inherit player chrome.
  if (pathname?.startsWith('/admin')) {
    return children;
  }

  // A launched game takes the full width — no rails, no footer.
  const isPlayRoute = pathname?.startsWith('/play/');

  // The player's own account pages drop the footer card on phones (the top bar
  // drops the lobby strips to match) so the task fills the small viewport.
  // See accountRoutes.js.
  const hideChromeOnMobile = isAccountRoute(pathname);

  return (
    <Theme5AuthModalContext.Provider value={modalValue}>
      {/* Column flex so the footer can be pushed to the viewport bottom on
          short pages: the content region grows, the footer keeps its height. */}
      <div className="theme5-root flex min-h-screen flex-col">
        <Theme5TopBar />

        {isPlayRoute ? (
          <main className="min-h-[60vh]">{children}</main>
        ) : (
          <>
            <div className="mx-auto flex w-full max-w-[1500px] flex-1 items-start gap-4 px-3 py-4">
              <Theme5Sidebar />
              <main className="min-w-0 flex-1">{children}</main>
              <Theme5RightRail />
            </div>
            {/* Outside the centre column: the footer spans the full width and
                sits below the rails instead of floating beside them. Hidden by
                CSS on phones for account pages, so desktop is unchanged. */}
            <div
              className={`mx-auto w-full max-w-[1500px] px-3 pb-4 ${
                hideChromeOnMobile ? HIDE_ON_MOBILE : ''
              }`}
            >
              <Theme5Footer />
            </div>
          </>
        )}

        {/* Floating support button — renders itself on the home route only. */}
        <WhatsAppButton />

        <Theme5AuthModals />
      </div>
    </Theme5AuthModalContext.Provider>
  );
}
