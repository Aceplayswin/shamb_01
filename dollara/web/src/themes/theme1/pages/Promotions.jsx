'use client';

// Promotions — current offers. Static catalogue for now (no player-facing promo
// API yet). Registered under theme1; other themes fall back to this page.

import Link from 'next/link';

const PROMOS = [
  {
    tag: 'Welcome',
    title: '100% First Deposit Bonus',
    desc: 'Double your first deposit up to ₹10,000. Auto-credited on your first top-up.',
    cta: 'Deposit now',
    href: '/deposit',
  },
  {
    tag: 'Daily',
    title: '5% Daily Cashback',
    desc: 'Get 5% cashback on net losses every day, credited to your wallet each morning.',
    cta: 'View wallet',
    href: '/wallet',
  },
  {
    tag: 'Referral',
    title: 'Refer & Earn ₹500',
    desc: 'Invite friends and earn ₹500 for every friend who deposits and plays.',
    cta: 'Invite friends',
    href: '/refer',
  },
  {
    tag: 'Weekend',
    title: 'Weekend Reload Bonus',
    desc: 'Reload your account every weekend and claim a 50% bonus up to ₹5,000.',
    cta: 'Deposit now',
    href: '/deposit',
  },
];

export default function Theme1Promotions() {
  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Promotions</h1>
      <p className="mt-1 text-sm text-slate-400">
        Live offers and bonuses. Terms &amp; wagering requirements apply.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {PROMOS.map((p) => (
          <section key={p.title} className="card-glass relative flex flex-col overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand-500/10 blur-2xl" />
            <span className="inline-flex items-center rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-300">
              {p.tag}
            </span>
            <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
            <Link
              href={p.href}
              className="mt-auto inline-flex self-start rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-surface-900 transition hover:bg-brand-400"
            >
              {p.cta}
            </Link>
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Bonuses are subject to our{' '}
        <Link href="/rules" className="text-brand-400 hover:underline">
          rules &amp; bonus policy
        </Link>
        .
      </p>
    </main>
  );
}
