'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

function profileInitials(user) {
  const name = user?.full_name ?? user?.username ?? '';
  if (!name) return 'P';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const STYLES = {
  theme1: {
    button:
      'grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-hairline/10 bg-gradient-to-br from-brand-400/30 to-brand-600/20 text-xs font-bold text-app-fg transition hover:border-brand-400/50',
    menu: 'absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-hairline/10 bg-panel-strong py-1 shadow-lg',
    item: 'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-app-fg transition hover:bg-hairline/[0.06]',
    logout: 'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10',
  },
  theme2: {
    button:
      'grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-amber-400/40 bg-gradient-to-br from-amber-500/30 to-amber-700/20 text-xs font-bold text-white transition hover:border-amber-400',
    menu: 'absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0d1420] py-1 shadow-lg',
    item: 'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5',
    logout: 'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10',
  },
};

export function ProfileMenu({ variant = 'theme1', buttonClassName }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const styles = STYLES[variant] ?? STYLES.theme1;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.push('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName ?? styles.button}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account menu"
      >
        {profileInitials(user)}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <Link
            href="/profile"
            role="menuitem"
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <button type="button" role="menuitem" className={styles.logout} onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
