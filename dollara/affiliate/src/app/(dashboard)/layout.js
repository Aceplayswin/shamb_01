// src/app/(dashboard)/layout.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Sidebar from './_components/Sidebar';
import Header from './_components/Header';
import { AffiliateProvider } from '../../context/AffiliateContext';
import { getAffiliateToken } from '../../services/affiliateApi';

/**
 * Shell for every signed-in screen — and the portal's only auth boundary.
 *
 * The guard has to live here because this is the one component every dashboard
 * route passes through. Without it each of those routes is reachable by typing
 * its URL, which is how this app behaved before: /finance/payouts rendered for
 * anyone who knew the path.
 *
 * `ready` gates the first paint so a signed-out visitor never sees a flash of
 * the console before being redirected.
 */
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [theme, setTheme] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAffiliateToken()) {
      router.replace('/login');
      return;
    }
    const savedTheme = localStorage.getItem('affiliate-theme') || 'light';
    setTheme(savedTheme);
    setReady(true);
  }, [router]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('affiliate-theme', newTheme);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA] dark:bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} w-full h-full`}>
      <AffiliateProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6FA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
          {/* Persistent left sidebar */}
          <Sidebar theme={theme} />

          {/* Main content area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Persistent top header */}
            <Header theme={theme} toggleTheme={toggleTheme} />

            {/* Dynamic page content */}
            <main className="flex-1 overflow-y-auto p-6 bg-[#F4F6FA] dark:bg-slate-950 transition-colors duration-300">
              {children}
            </main>
          </div>
        </div>
      </AffiliateProvider>
    </div>
  );
}
