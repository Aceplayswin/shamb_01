'use client';

// Theme2 Promotions — the public offer catalogue: admin-authored posters
// (Content → Promotions) plus the live bonus catalogue (Bonuses panel). This is
// deliberately a BROWSE page — "what could I claim" — while claiming itself
// (coupon codes, one-tap claim, wagering ledger) lives on /bonus, "what I hold".

import Link from 'next/link';
import { Gift, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { usePromotions } from '@/hooks/usePromotions';
import { usePromotionPosters } from '@/hooks/usePromotionPosters';
import PromotionPosterCard from '@/components/PromotionPosterCard';
import { T2Card, t2BtnPrimary } from '../components/ui';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

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

// Browsing only claims nothing directly — the CTA sends the player to wherever
// the offer is actually unlocked (a deposit for deposit/reload bonuses, the
// referral page for referral bonuses) or to /bonus, where every claimable and
// held bonus lives.
function ctaFor(p) {
  if (p.bonus_type === 'deposit' || p.bonus_type === 'reload') return { label: 'Deposit now', href: '/deposit' };
  if (p.bonus_type === 'referral') return { label: 'Invite friends', href: '/refer' };
  return { label: 'View my bonuses', href: '/bonus' };
}

export default function Theme2Promotions() {
  const token = useAuthStore((s) => s.token);
  const { promotions, loading } = usePromotions();
  const { posters, loading: postersLoading } = usePromotionPosters();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Promotions</h1>
      <p className="mt-1 text-sm text-slate-400">
        Live offers and bonuses. Terms &amp; wagering requirements apply.
      </p>

      {/* ── Admin-authored posters ── */}
      {postersLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[16/9] animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : posters.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posters.map((p) => (
            <PromotionPosterCard
              key={p.id}
              poster={p}
              className="border border-white/5 bg-[#0d1420] text-white transition hover:border-amber-400/40"
            />
          ))}
        </div>
      ) : null}

      {/* ── Live bonus catalogue ── */}
      <h2 className="mb-4 mt-10 flex items-center gap-2 font-display text-lg font-bold text-white">
        <Sparkles className="h-5 w-5 text-amber-400" /> Current bonuses
      </h2>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <T2Card key={i} className="h-44 animate-pulse p-6" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <T2Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Gift className="h-8 w-8 text-amber-400" />
          <p className="font-display text-lg font-bold text-white">No active promotions right now</p>
          <p className="text-sm text-slate-400">Check back soon for new bonuses and offers.</p>
        </T2Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {promotions.map((p) => {
            const cta = ctaFor(p);
            return (
              <section
                key={p.id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-amber-600/10 via-[#0d1420] to-[#070d16] p-6"
              >
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl" />
                <span className="inline-flex w-fit items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  {TYPE_LABEL[p.bonus_type] || 'Bonus'}
                </span>
                <h3 className="mt-3 font-display text-lg font-black text-white">{p.title}</h3>
                <p className="mt-1 font-display text-base font-bold text-amber-400">{rewardText(p)}</p>
                {p.description && <p className="mt-1 text-sm text-slate-400">{p.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {p.min_deposit > 0 && <span>Min deposit {inr(p.min_deposit)}</span>}
                  {p.wagering_multiplier > 0 && <span>Wagering {p.wagering_multiplier}×</span>}
                  {p.has_promo_code && <span className="text-amber-400">Promo code required</span>}
                </div>
                <Link href={cta.href} className={`${t2BtnPrimary} mt-auto self-start text-sm`}>
                  {cta.label}
                </Link>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        {token ? (
          <>
            Have a promo code?{' '}
            <Link href="/bonus" className="font-bold text-amber-400 hover:underline">
              Redeem it on My Bonuses
            </Link>
            .
          </>
        ) : (
          <>
            <Link href="/register" className="font-bold text-amber-400 hover:underline">
              Create an account
            </Link>{' '}
            to claim these offers.
          </>
        )}
      </p>
    </div>
  );
}
