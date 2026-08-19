'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getAgentToken } from '../services/agentApi';

/**
 * The panel has no marketing front page — an agent either has a session or
 * needs one, so `/` only decides which of the two to show.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getAgentToken() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
    </div>
  );
}
