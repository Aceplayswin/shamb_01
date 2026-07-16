'use client';

// Promotions — live offers driven by the product admin's Bonuses panel
// (/api/v1/promotions). Logged-in players can redeem promo-code bonuses here.

import { useState } from 'react';
import Link from 'next/link';
import { Gift, Ticket } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { usePromotions } from '@/hooks/usePromotions';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Map a bonus type to a short tag label + the most sensible call-to-action.
const TYPE_LABEL = {
  joining: 'Welcome',
  deposit: 'Deposit',
  referral: 'Referral',
  game: 'Play',
  cashback: 'Cashback',
  no_deposit: 'Free',
  free_spins: 'Free spins',
  loyalty: 'VIP',
  reload: 'Reload',
  manual: 'Special',
};

function rewardText(p) {
  if (p.value_type === 'percentage') {
    const cap = p.max_bonus_cap ? ` up to ${inr(p.max_bonus_cap)}` : '';
    return `${p.value_amount}% bonus${cap}`;
  }
  return `${inr(p.value_amount)} bonus`;
}

function ctaFor(p) {
  if (p.bonus_type === 'deposit' || p.bonus_type === 'reload') return { label: 'Deposit now', href: '/deposit' };
  if (p.bonus_type === 'referral') return { label: 'Invite friends', href: '/refer' };
  return { label: 'View wallet', href: '/wallet' };
}

export default function Theme1Promotions() {
  const { promotions, loading } = usePromotions();
  const token = useAuthStore((s) => s.token);
  const [code, setCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState(null);

  const claim = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setClaiming(true);
    setMsg(null);
    try {
      const res = await api('/api/v1/bonuses/claim', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      setMsg({ type: 'ok', text: `${res.title} claimed — ${inr(res.amount)} added to your bonus balance.` });
      setCode('');
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Could not claim this code.' });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Promotions</h1>
      <p className="mt-1 text-sm text-slate-400">
        Live offers and bonuses. Terms &amp; wagering requirements apply.
      </p>

      {/* Promo-code redemption — only useful once signed in. */}
      {token && (
        <form onSubmit={claim} className="card-glass mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
              <Ticket className="h-4 w-4 text-brand-400" /> Have a promo code?
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code, e.g. WELCOME100"
              className="w-full rounded-xl border border-hairline/10 bg-panel/60 px-4 py-3 uppercase tracking-widest text-app-fg placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/70 focus:border-brand-400/50 focus:outline-none"
              maxLength={40}
            />
          </label>
          <button
            type="submit"
            disabled={claiming || !code.trim()}
            className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-60"
          >
            {claiming ? 'Claiming…' : 'Claim'}
          </button>
        </form>
      )}
      {msg && (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            msg.type === 'ok'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}
        >
          {msg.text}
        </p>
      )}

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-glass h-44 animate-pulse p-6" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="card-glass mt-6 flex flex-col items-center gap-2 p-12 text-center">
          <Gift className="h-8 w-8 text-brand-400" />
          <p className="text-lg font-semibold">No active promotions right now</p>
          <p className="text-sm text-slate-400">Check back soon for new bonuses and offers.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {promotions.map((p) => {
            const cta = ctaFor(p);
            return (
              <section key={p.id} className="card-glass relative flex flex-col overflow-hidden p-6">
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand-500/10 blur-2xl" />
                <span className="inline-flex items-center rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-300">
                  {TYPE_LABEL[p.bonus_type] || 'Bonus'}
                </span>
                <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
                <p className="mt-1 text-sm text-brand-300">{rewardText(p)}</p>
                {p.description && <p className="mt-1 text-sm text-slate-400">{p.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {p.min_deposit > 0 && <span>Min deposit {inr(p.min_deposit)}</span>}
                  {p.wagering_multiplier > 0 && <span>Wagering {p.wagering_multiplier}×</span>}
                  {p.has_promo_code && <span className="text-brand-400">Promo code required</span>}
                </div>
                <Link
                  href={cta.href}
                  className="mt-auto inline-flex self-start rounded-xl bg-brand-500 px-5 py-2.5 pt-3 text-sm font-semibold text-surface-900 transition hover:bg-brand-400"
                >
                  {cta.label}
                </Link>
              </section>
            );
          })}
        </div>
      )}

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
