'use client';

// Theme2 My Bonuses — dark-navy / gold. The player's own awarded bonus ledger
// and wagering progress (/api/v1/bonuses/mine), plus the two ways to acquire
// one: a coupon code (useCouponRedeem — shared logic, theme2's own markup) and
// one-tap claim on any live offer that carries a promo code. Deliberately
// separate from /promotions, which is the public catalogue anyone can browse:
// this page is "what I hold and can claim", that page is "what exists".

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gift, Sparkles, Ticket, Check, AlertCircle, Lock, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime } from '@/lib/datetime';
import { useCouponRedeem } from '@/hooks/useCouponRedeem';
import { T2Card, t2Input, t2BtnPrimary } from '../components/ui';

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
  pending: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-sky-500/15 text-sky-400',
  expired: 'bg-white/10 text-slate-400',
  forfeited: 'bg-rose-500/15 text-rose-400',
};

export default function Theme2Bonus() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  // Offers the player can still claim, so this page can hand them the bonus
  // instead of pointing at a promotions page that only shows posters/cards.
  const [offers, setOffers] = useState([]);

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

  // Claim conditions are live figures (real balance, turnover, deposits), so
  // the offer list is pulled again whenever the wallet moves.
  const walletReal = wallet?.real ?? wallet?.main;
  const walletBonus = wallet?.bonus;
  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    api('/api/v1/promotions')
      .then((data) => active && setOffers(Array.isArray(data) ? data : []))
      .catch(() => active && setOffers([]));
    return () => {
      active = false;
    };
  }, [token, walletReal, walletBonus]);

  // A redeemed coupon adds a row to the ledger and moves the wallet, so pull
  // both again rather than making the player reload the page.
  const onRedeemed = useCallback(async () => {
    await api('/api/v1/bonuses/mine')
      .then((data) => setBonuses(Array.isArray(data) ? data : []))
      .catch(() => {});
    api('/api/v1/promotions')
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch(() => {});
    refreshSession();
  }, [refreshSession]);

  if (!token) return null;

  const activeCount = bonuses.filter((b) => b.status === 'active').length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">My Bonuses</h1>
      <p className="mt-1 text-sm text-slate-400">Bonus credits you hold and their wagering progress.</p>

      <RedeemCoupon onRedeemed={onRedeemed} />

      <AvailableOffers offers={offers} onClaimed={onRedeemed} />

      {/* Bonus vs real money — the distinction that decides what is withdrawable */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <T2Card className="p-5">
          <p className="text-[0.6rem] font-black uppercase tracking-wide text-amber-400">Bonus balance</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-white">{inr(wallet?.bonus)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Playable now · becomes withdrawable once wagering is cleared
          </p>
        </T2Card>
        <T2Card className="p-5">
          <p className="text-[0.6rem] font-black uppercase tracking-wide text-emerald-400">Real balance</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-white">
            {inr(wallet?.real ?? wallet?.main)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Yours to withdraw any time</p>
        </T2Card>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/promotions" className={`${t2BtnPrimary} inline-flex items-center gap-1.5 text-sm`}>
          <Sparkles className="h-4 w-4" /> Browse promotions
        </Link>
        {!loading && (
          <span className="text-xs font-semibold text-slate-500">
            {activeCount} active bonus{activeCount === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      <section className="mt-6 space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => <T2Card key={i} className="h-28 animate-pulse" />)
        ) : bonuses.length === 0 ? (
          <T2Card className="flex flex-col items-center gap-2 p-12 text-center">
            <Gift className="h-8 w-8 text-amber-400" />
            <p className="font-display text-lg font-bold text-white">No bonuses yet</p>
            <p className="text-sm text-slate-400">Claim an offer above to get started.</p>
          </T2Card>
        ) : (
          bonuses.map((b) => <BonusCard key={b.id} bonus={b} />)
        )}
      </section>
    </div>
  );
}

// --- Coupon redemption ------------------------------------------------------
function RedeemCoupon({ onRedeemed }) {
  const { code, onCodeChange, check, redeem, checking, redeeming, preview, error, success, busy } =
    useCouponRedeem({ onRedeemed });

  const submit = (e) => {
    e.preventDefault();
    if (preview?.valid) redeem();
    else check();
  };

  return (
    <T2Card className="mt-6 p-5">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-amber-400" />
        <h2 className="font-display text-base font-black uppercase tracking-wide text-white">
          Redeem a coupon code
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Got a code? Enter it below to add the bonus to your account. Each code can be redeemed once
        per player.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="e.g. GET100"
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          aria-label="Coupon code"
          className={`${t2Input} flex-1 font-mono uppercase tracking-[0.2em] placeholder:font-sans placeholder:tracking-normal`}
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className={`${t2BtnPrimary} shrink-0 text-xs disabled:cursor-not-allowed`}
        >
          {checking ? 'Checking…' : redeeming ? 'Redeeming…' : preview?.valid ? 'Redeem' : 'Apply'}
        </button>
      </form>

      {preview?.valid && !success && (
        <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3">
          <p className="text-sm font-black text-white">
            {preview.title} · {inr(preview.amount)}
          </p>
          {preview.wagering_required > 0 && (
            <p className="mt-0.5 text-xs text-slate-400">
              Credited instantly and playable. Wager {inr(preview.wagering_required)} (
              {preview.wagering_multiplier}×) to unlock it for withdrawal.
            </p>
          )}
          <p className="mt-1 text-xs font-semibold text-emerald-400">Press Redeem to claim it.</p>
        </div>
      )}

      {success && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-black text-white">
              {inr(success.amount)} added — {success.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {success.withdrawable
                ? 'Credited to your withdrawable balance.'
                : `Added to your bonus balance — play with it now. Complete ${inr(
                    success.wagering_required,
                  )} of wagering to make it withdrawable.`}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-400">{error}</p>
            {preview && !preview.valid && preview.requirements?.some((r) => !r.met) && (
              <OfferRequirements offer={preview} />
            )}
          </div>
        </div>
      )}
    </T2Card>
  );
}

function BonusCard({ bonus }) {
  const required = Number(bonus.wagering_required ?? 0);
  const done = Number(bonus.wagering_completed ?? 0);
  const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 100;
  const tone = STATUS_TONE[bonus.status] ?? STATUS_TONE.expired;

  return (
    <T2Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-black text-white">
            {bonus.title || SOURCE_LABEL[bonus.source] || 'Bonus'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {SOURCE_LABEL[bonus.source] ?? bonus.source}
            {bonus.created_at ? ` · ${formatDateTime(bonus.created_at)}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-black tabular-nums text-amber-400">{inr(bonus.amount)}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wide ${tone}`}>
            {bonus.status}
          </span>
        </div>
      </div>

      {required > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Wagering progress</span>
            <span className="tabular-nums">
              {inr(done)} / {inr(required)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[0.65rem] text-slate-500">
            {pct}% complete{bonus.expires_at ? ` · expires ${formatDateTime(bonus.expires_at)}` : ''}
          </p>
        </div>
      )}
    </T2Card>
  );
}

// --- Claimable offers -------------------------------------------------------
function AvailableOffers({ offers, onClaimed }) {
  const [busyId, setBusyId] = useState(null);
  const [result, setResult] = useState(null); // { id, ok, message }

  if (!offers.length) return null;

  const claim = async (offer) => {
    if (!offer.promo_code || offer.claimable === false) return;
    setBusyId(offer.id);
    setResult(null);
    try {
      const res = await api('/api/v1/bonuses/claim', {
        method: 'POST',
        body: JSON.stringify({ code: offer.promo_code }),
      });
      setResult({ id: offer.id, ok: true, message: `${inr(res.amount)} added — ${res.title}` });
      onClaimed?.();
    } catch (err) {
      setResult({ id: offer.id, ok: false, message: err.message || 'Could not claim this offer.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <T2Card className="mt-6 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h2 className="font-display text-base font-black uppercase tracking-wide text-white">
          Offers you can claim
        </h2>
      </div>

      <ul className="mt-3 space-y-2">
        {offers.map((offer) => (
          <li
            key={offer.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#070d16] p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{offer.title}</p>
              <p className="text-xs text-slate-400">
                {offer.value_type === 'percentage' ? `${offer.value_amount}% bonus` : inr(offer.value_amount)}
                {offer.min_deposit > 0 && ` · min deposit ${inr(offer.min_deposit)}`}
                {offer.wagering_multiplier > 0 && ` · ${offer.wagering_multiplier}× wagering`}
              </p>
              {offer.promo_code && (
                <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">
                  {offer.promo_code}
                </p>
              )}
              {offer.end_date && (
                <p className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-slate-500">
                  <Clock className="h-3 w-3" /> Valid till {formatDateTime(offer.end_date)}
                </p>
              )}
              <OfferRequirements offer={offer} />
            </div>
            <OfferClaimButton offer={offer} busy={busyId === offer.id} onClaim={() => claim(offer)} />
          </li>
        ))}
      </ul>

      {result && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-xl border p-3 ${
            result.ok ? 'border-emerald-500/25 bg-emerald-500/[0.07]' : 'border-rose-500/25 bg-rose-500/[0.07]'
          }`}
        >
          {result.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          )}
          <p className={`text-sm font-semibold ${result.ok ? 'text-white' : 'text-rose-400'}`}>{result.message}</p>
        </div>
      )}
    </T2Card>
  );
}

function OfferRequirements({ offer }) {
  const reqs = Array.isArray(offer.requirements) ? offer.requirements : [];
  if (!reqs.length) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {reqs.map((req) => {
        const required = Number(req.required ?? 0);
        const current = Number(req.current ?? 0);
        const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100;
        return (
          <li key={req.key} className="min-w-[220px]">
            <div className="flex items-center justify-between gap-3 text-[0.65rem] font-semibold">
              <span className={req.met ? 'text-emerald-400' : 'text-slate-400'}>
                {req.met ? <Check className="mr-1 inline h-3 w-3" /> : <Lock className="mr-1 inline h-3 w-3" />}
                {req.label}
              </span>
              <span className="tabular-nums text-slate-300">
                {inr(current)} / {inr(required)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all ${req.met ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OfferClaimButton({ offer, busy, onClaim }) {
  if (!offer.promo_code) {
    return <span className="shrink-0 text-xs font-semibold text-slate-500">Awarded automatically</span>;
  }
  if (offer.already_claimed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-400">
        <Check className="h-3.5 w-3.5" /> Claimed
      </span>
    );
  }
  const locked = offer.claimable === false;
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClaim}
        disabled={busy || locked}
        title={locked ? offer.claim_blocked_reason || 'Requirements not met yet' : undefined}
        aria-disabled={busy || locked}
        className={`${t2BtnPrimary} inline-flex items-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {locked && <Lock className="h-3.5 w-3.5" />}
        {busy ? 'Claiming…' : 'Claim'}
      </button>
      {locked && (
        <span className="max-w-[220px] text-right text-[0.65rem] font-semibold text-slate-500">
          {offer.requirements_met === false
            ? 'Unlocks when the conditions are met'
            : offer.claim_blocked_reason || 'Not available right now'}
        </span>
      )}
    </div>
  );
}
