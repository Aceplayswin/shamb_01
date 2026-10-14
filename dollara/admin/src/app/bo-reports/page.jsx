'use client';

// The Backoffice Reports index has been folded into Reports — its groups are now
// the "Backoffice" tab there. The individual report screens under /bo-reports/*
// still exist and are linked from that tab; this route only redirects anyone
// holding an old link or bookmark.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BackofficeReportsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/reports');
  }, [router]);
  return null;
}
