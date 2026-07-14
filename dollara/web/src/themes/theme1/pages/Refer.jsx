'use client';

// Refer & Earn — shareable referral link derived from the player's username.
// No referral API yet, so the code is derived client-side. Registered under
// theme1; other themes fall back to this page.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

const STEPS = [
  { icon: '🔗', title: 'Share your link', desc: 'Send your referral link to friends.' },
  { icon: '💰', title: 'They deposit & play', desc: 'Your friend signs up and makes a deposit.' },
  { icon: '🎁', title: 'You both earn', desc: 'Get ₹500 credited once they start playing.' },
];

export default function Theme1Refer() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const code = useMemo(() => {
    const base = (user?.username || 'PLAYER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return base.slice(0, 10);
  }, [user]);

  const link = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/register?ref=${code}`;
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!token) return null;

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Refer &amp; Earn</h1>
      <p className="mt-1 text-sm text-slate-400">
        Earn ₹500 for every friend who joins and plays.
      </p>

      {/* ---- Referral link ---- */}
      <section className="mt-6 card-glass relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand-500/10 blur-2xl" />
        <p className="text-sm text-slate-400">Your referral code</p>
        <p className="mt-1 text-3xl font-extrabold tracking-widest text-gradient-gold">{code}</p>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-surface-700 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{link}</span>
          <button
            type="button"
            onClick={copy}
            className="flex-shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-surface-900 transition hover:bg-brand-400"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold">How it works</h2>
        <div className="mt-4 space-y-3">
          {STEPS.map((s) => (
            <div key={s.title} className="card-glass flex items-center gap-4 p-4">
              <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-brand-500/15 text-xl">
                {s.icon}
              </span>
              <div>
                <p className="font-medium text-white">{s.title}</p>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
