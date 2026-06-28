'use client';

// Legacy admin sign-in route. Login is now unified into a single UI (/login)
// where a "Staff" toggle switches the form to username auth and the server's
// role decides the destination. We keep this path alive so old bookmarks and
// the adminApi 401 handler (which redirects here) still land somewhere sane:
//   - already signed in  → /admin
//   - otherwise          → /login?staff=1 (unified login, staff mode preselected)

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getAdminToken } from '@/services/adminApi';

export default function AdminLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getAdminToken() ? '/admin' : '/login?staff=1');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
    </div>
  );
}
