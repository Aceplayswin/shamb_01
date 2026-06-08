'use client';

import { usePathname } from 'next/navigation';

export function AppFrame({ children }) {
  const pathname = usePathname();
  // The admin console and super admin portal render their own shells, so they
  // must not inherit the player-site chrome offsets.
  if (pathname?.startsWith('/admin')) {
    return children;
  }
  // Global app shell offsets: top bar (h-16), desktop side rail (w-[92px]),
  // and mobile bottom tab bar.
  return <div className="min-h-screen pt-16 pb-20 lg:pb-0 lg:pl-[92px]">{children}</div>;
}
