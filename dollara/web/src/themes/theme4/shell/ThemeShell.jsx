'use client';

// Theme4 shell — "EXCHANGE": a teal sports-exchange skin (Radhe Exchange
// reference). Distinct chrome from theme1/2/3: a dark announcement ticker, teal
// gradient header, dense dark-teal category nav, light gray page surface, and a
// provider-band footer with the DOWNLOAD APK banner. Auth is presented as a
// compact modal owned here, so the header LOG IN button and the /login +
// /register routes can open it.
//
// The whole tree is scoped with `theme4-root` so the teal palette holds
// regardless of the app-wide light/dark toggle (mirrors theme2/3 scoping).

import { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Theme4TopBar } from './TopBar';
import { Theme4NavBar } from './NavBar';
import { Theme4Footer } from './Footer';
import { Theme4AuthModals } from './AuthModals';
import { Theme4AuthModalContext } from './authModalContext';

export default function Theme4Shell({ children }) {
  const pathname = usePathname();
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'

  const open = useCallback((mode) => setAuthMode(mode), []);
  const close = useCallback(() => setAuthMode(null), []);
  const modalValue = useMemo(() => ({ mode: authMode, open, close }), [authMode, open, close]);

  // The admin console renders its own shell and must not inherit player chrome.
  if (pathname?.startsWith('/admin')) {
    return children;
  }

  const isPlayRoute = pathname?.startsWith('/play/');

  return (
    <Theme4AuthModalContext.Provider value={modalValue}>
      <div className="theme4-root min-h-screen">
        <Theme4TopBar />
        {!isPlayRoute && <Theme4NavBar />}
        <main className="min-h-[60vh]">{children}</main>
        {!isPlayRoute && <Theme4Footer />}
        <Theme4AuthModals />
      </div>
    </Theme4AuthModalContext.Provider>
  );
}
