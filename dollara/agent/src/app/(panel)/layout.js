'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, Loader2 } from 'lucide-react';
import TopNav from './_components/TopNav';
import Footer from './_components/Footer';
import { AgentProvider } from '../../context/AgentContext';
import { getAgentToken } from '../../services/agentApi';

/**
 * Shell for every signed-in screen — and the panel's only auth boundary.
 *
 * The guard has to live here because this is the one component every panel
 * route passes through. Without it each of those routes is reachable by typing
 * its URL.
 *
 * `ready` gates the first paint so a signed-out visitor never sees a flash of
 * the console before being redirected.
 */
export default function PanelLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    if (!getAgentToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <AgentProvider>
      <div className="flex min-h-screen flex-col">
        {!navCollapsed && <TopNav />}

        {/* The collapse strip. On a laptop the nav costs a sixth of the
            viewport, and an agent watching a live book wants the table. */}
        <div className="flex items-center justify-center bg-shell-rail py-2.5">
          <button
            type="button"
            onClick={() => setNavCollapsed((collapsed) => !collapsed)}
            aria-expanded={!navCollapsed}
            aria-label={navCollapsed ? 'Show navigation' : 'Hide navigation'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-800 shadow transition hover:bg-slate-200"
          >
            <ChevronUp
              className={`h-5 w-5 transition-transform ${navCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>

        <Footer />
      </div>
    </AgentProvider>
  );
}
