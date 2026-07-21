'use client';

// Theme 1 shell — the original Dollara chrome: full-height side rail + top bar
// (Header), matching layout offsets, and the Footer. Pages render only their
// body content inside this frame (they no longer render Header/Footer).

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Theme1AuthModals } from './AuthModals';

export default function Theme1Shell({ children }) {
  const pathname = usePathname();

  // The admin console renders its own shell and must not inherit player chrome.
  if (pathname?.startsWith('/admin')) {
    return children;
  }

  const isPlayRoute = pathname?.startsWith('/play/');

  return (
    <>
      <Header />
      {/* Global app shell offsets: top bar (h-16), desktop side rail (w-[92px]),
          and mobile bottom tab bar. Flex column + flex-1 content keeps the footer
          pinned to the bottom of the viewport even when a page is short. */}
      <div className={`flex min-h-screen flex-col pt-16 lg:pl-[92px] ${isPlayRoute ? 'pb-0' : 'pb-20 lg:pb-0'}`}>
        <div className="flex-1">{children}</div>
        {!isPlayRoute && <Footer />}
      </div>
      <Theme1AuthModals />
    </>
  );
}
