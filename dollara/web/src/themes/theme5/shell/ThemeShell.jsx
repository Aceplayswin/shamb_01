'use client';

// Theme5 shell — "VELPLAY": a light three-column portal. Distinct chrome from
// theme1-4: a black LATEST NEWS ticker, white icon nav on a blue rule, an emoji
// category rail, then a three-column body — sports/casino link rail on the left,
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
import { Theme5AuthModalContext } from './authModalContext';

export default function Theme5Shell({ children }) {
  const pathname = usePathname();
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'

  const open = useCallback((mode) => setAuthMode(mode), []);
  const close = useCallback(() => setAuthMode(null), []);
  const modalValue = useMemo(() => ({ mode: authMode, open, close }), [authMode, open, close]);

  // The admin console renders its own shell and must not inherit player chrome.
  if (pathname?.startsWith('/admin')) {
    return children;
  }

  // A launched game takes the full width — no rails, no footer.
  const isPlayRoute = pathname?.startsWith('/play/');

  return (
    <Theme5AuthModalContext.Provider value={modalValue}>
      <div className="theme5-root flex min-h-screen flex-col">
        <Theme5TopBar />

        {isPlayRoute ? (
          <main className="min-h-[60vh]">{children}</main>
        ) : (
          <div className="mx-auto flex w-full max-w-[1500px] flex-1 gap-4 px-3 py-4">
            <Theme5Sidebar />
            <main className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1">{children}</div>
              <Theme5Footer />
            </main>
            <Theme5RightRail />
          </div>
        )}

        <Theme5AuthModals />
      </div>
    </Theme5AuthModalContext.Provider>
  );
}
