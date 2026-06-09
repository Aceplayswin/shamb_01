'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { ProfileMenu } from '@/components/ProfileMenu';

export function UserAuthActions({
  loginClassName,
  registerClassName,
  profileClassName,
}) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return <span className="inline-block h-9 w-[7.5rem]" aria-hidden />;
  }

  if (token) {
    return <ProfileMenu variant="theme1" buttonClassName={profileClassName} />;
  }

  return (
    <>
      <Link
        href="/login"
        className={
          loginClassName ??
          'rounded-xl border border-hairline/10 px-4 py-2 text-xs font-bold text-app-fg transition hover:border-brand-400/50 hover:bg-panel'
        }
      >
        LOG IN
      </Link>
      <Link
        href="/register"
        className={
          registerClassName ??
          'rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-xs font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500'
        }
      >
        REGISTER
      </Link>
    </>
  );
}

export function UserAuthIcon({ className }) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) return null;

  return (
    <Link
      href={token ? '/profile' : '/login'}
      className={className}
      title={token ? 'View profile' : 'Sign in'}
    >
      <User className="h-5 w-5" />
    </Link>
  );
}
