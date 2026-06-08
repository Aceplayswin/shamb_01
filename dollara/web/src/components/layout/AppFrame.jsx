'use client';

import { usePathname } from 'next/navigation';
import { useActiveTheme } from '@/hooks/useActiveTheme';

export function AppFrame({ children }) {
  const pathname = usePathname();
  const { theme } = useActiveTheme();
  // The admin console and super admin portal render their own shells, so they
  // must not inherit the player-site chrome offsets.
  if (pathname?.startsWith('/admin')) {
    return children;
  }
  // Shell offsets come from the active theme's chrome (e.g. theme1's side rail
  // vs theme2's top nav). Falls back to theme1's offsets if unset.
  const frameClassName = theme?.frameClassName ?? 'min-h-screen pt-16 pb-20 lg:pb-0 lg:pl-[92px]';
  return <div className={frameClassName}>{children}</div>;
}
