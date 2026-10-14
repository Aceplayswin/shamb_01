'use client';

// My Bonuses — the player's own awarded bonus ledger and wagering progress
// (/api/v1/bonuses/mine). Deliberately separate from /promotions, which is the
// public catalogue of offers anyone can browse: this page is "what I hold",
// that page is "what I could claim".

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gift, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

const SOURCE_LABEL = {
  joining: 'Welcome bonus',
  deposit: 'Deposit bonus',
  referral: 'Referral bonus',
  game: 'Play bonus',
  cashback: 'Cashback',
  promo: 'Promo code',
  manual: 'Special credit',
};

const STATUS_TONE = {
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-sky-500/15 text-sky-400',
  expired: 'bg-slate-500/15 text-slate-400',
  forfeited: 'bg-red-500/15 text-red-400',
};

export default function Theme1Bonus() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    let active = true;
    refreshSession();
    api('/api/v1/bonuses/mine')
      .then((data) => active && setBonuses(Array.isArray(data) ? data : []))
      .catch(() => active && setBonuses([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, router, refreshSession]);

  if (!token) return null;

  const active = bonuses.filter((b) => b.status === 'active');

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">My Bonuses</h1>
      <p className="mt-1 text-sm text-slate-400">
        Bonus credits you hold and their wagering progress.
      </p>

      {/* Bonus vs real money — the distinction that decides what is withdrawable */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-glass border border-brand-500/20 p-5">
          <p className="text-[0.65rem] uppercase tracking-wide text-brand-300">
            Bonus balance
          </p>
          <p className="mt-1 text-3xl font-bold text-white">{inr(wallet?.bonus)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Becomes withdrawable once wagering is cleared
          </p>
        </div>
        <div className="card-glass border border-emerald-500/20 p-5">
          <p className="text-[0.65rem] uppercase tracking-wide text-emerald-300">
            Real balance
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {inr(wallet?.real ?? wallet?.main)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Yours to withdraw any time</p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/promotions"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-surface-900 transition hover:bg-brand-400"
        >
          <Sparkles className="h-4 w-4" /> Browse promotions
        </Link>
        <span className="text-xs text-slate-500">
          {active.length} active bonus{active.length === 1 ? '' : 'es'}
        </span>
      </div>

      <section className="mt-6 space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="card-glass h-28 animate-pulse" />)
        ) : bonuses.length === 0 ? (
          <div className="card-glass flex flex-col items-center gap-2 p-12 text-center">
            <Gift className="h-8 w-8 text-brand-400" />
            <p className="text-lg font-semibold">No bonuses yet</p>
            <p className="text-sm text-slate-400">
              Claim an offer from the promotions page to get started.
            </p>
          </div>
        ) : (
          bonuses.map((b) => <BonusCard key={b.id} bonus={b} />)
        )}
      </section>
    </main>
  );
}

function BonusCard({ bonus }) {
  const required = Number(bonus.wagering_required ?? 0);
  const done = Number(bonus.wagering_completed ?? 0);
  const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 100;
  const tone = STATUS_TONE[bonus.status] ?? STATUS_TONE.expired;

  return (
    <article className="card-glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">
            {bonus.title || SOURCE_LABEL[bonus.source] || 'Bonus'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {SOURCE_LABEL[bonus.source] ?? bonus.source}
            {bonus.created_at ? ` · ${formatDate(bonus.created_at)}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-brand-300">{inr(bonus.amount)}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold capitalize ${tone}`}
          >
            {bonus.status}
          </span>
        </div>
      </div>

      {required > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Wagering progress</span>
            <span>
              {inr(done)} / {inr(required)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[0.65rem] text-slate-500">
            {pct}% complete
            {bonus.expires_at ? ` · expires ${formatDate(bonus.expires_at)}` : ''}
          </p>
        </div>
      )}
    </article>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
