'use client';

// Theme3 My Bonuses — the player's own awarded bonus ledger and wagering
// progress (/api/v1/bonuses/mine), in VELPLAY's cream/gold style. Deliberately
// separate from /promotions, which is the public catalogue of offer posters
// anyone can browse: this page is "what I hold", that page is "what's on
// offer". Coupon redemption and claimable promo-code offers live here too, so
// a code the player was handed has somewhere to go.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gift, Sparkles, Ticket, Check, AlertCircle, Lock, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime as formatDate } from '@/lib/datetime';
import { useCouponRedeem } from '@/hooks/useCouponRedeem';
import { T3Card, t3Input, t3BtnPrimary, T3FormPage } from '../components/ui';

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

// Status pills. A live bonus is `active`: already credited to the bonus
// balance and playable, but still working off its wagering requirement.
// `completed` means the wagering cleared and the amount moved into the
// withdrawable real balance. `pending` is retained for legacy rows.
const STATUS_TONE = {
  active: 'bg-[#2fbf71]/12 text-[#1c8a52]',
  pending: 'bg-[#f3ead4] text-[#9a7a24]',
  completed: 'bg-[#efe9f6] text-[#6b52a8]',
  expired: 'bg-black/[0.06] text-[#9a94a8]',
  forfeited: 'bg-[#e5484d]/12 text-[#c23a3e]',
};

export default function Theme3Bonus() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  // Offers the player can still claim, with this player's claim state from
  // the server (conditions met or not, already claimed).
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
    <T3FormPage title="My Bonuses" subtitle="Bonus credits you hold and their wagering progress." maxWidth="max-w-3xl">
      <RedeemCoupon onRedeemed={onRedeemed} />

      <AvailableOffers offers={offers} onClaimed={onRedeemed} />

      {/* Bonus vs real money — the distinction that decides what is withdrawable */}
      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <T3Card className="p-5">
          <p className="text-[0.6rem] font-black uppercase tracking-wide text-[#9a94a8]">Bonus balance</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-[#1b1726]">{inr(wallet?.bonus)}</p>
          <p className="mt-1 text-xs text-[#9a94a8]">
            Playable now · becomes withdrawable once wagering is cleared
          </p>
        </T3Card>
        <T3Card className="p-5">
          <p className="text-[0.6rem] font-black uppercase tracking-wide text-[#1c8a52]">Real balance</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-[#1b1726]">
            {inr(wallet?.real ?? wallet?.main)}
          </p>
          <p className="mt-1 text-xs text-[#9a94a8]">Yours to withdraw any time</p>
        </T3Card>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/promotions" className={`${t3BtnPrimary} inline-flex items-center gap-1.5 text-xs`}>
          <Sparkles className="h-4 w-4" /> Browse promotions
        </Link>
        {!loading && (
          <span className="text-xs font-semibold text-[#9a94a8]">
            {activeCount} active bonus{activeCount === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      <section className="mt-4 space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-black/[0.04]" />)
        ) : bonuses.length === 0 ? (
          <T3Card className="flex flex-col items-center gap-2 p-12 text-center">
            <Gift className="h-8 w-8 text-[#c79a3b]" />
            <p className="font-display text-lg font-black text-[#1b1726]">No bonuses yet</p>
            <p className="text-sm text-[#6b6579]">Claim an offer from the promotions page to get started.</p>
          </T3Card>
        ) : (
          bonuses.map((b) => <BonusCard key={b.id} bonus={b} />)
        )}
      </section>
    </T3FormPage>
  );
}

// --- Coupon redemption ------------------------------------------------------
// The player types a code the operator handed out; redeeming credits that
// campaign's reward to this account, once per player. Applying first
// (preview) then redeeming means a mistyped code never burns the player's
// single attempt at a campaign.
function RedeemCoupon({ onRedeemed }) {
  const { code, onCodeChange, check, redeem, checking, redeeming, preview, error, success, busy } =
    useCouponRedeem({ onRedeemed });

  const submit = (e) => {
    e.preventDefault();
    if (preview?.valid) redeem();
    else check();
  };

  return (
    <T3Card className="p-5">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-[#c79a3b]" />
        <h2 className="font-display text-base font-black uppercase tracking-wide text-[#1b1726]">
          Redeem a coupon code
        </h2>
      </div>
      <p className="mt-1 text-xs text-[#6b6579]">
        Got a code? Enter it below to add the bonus to your account. Each code can be redeemed
        once per player.
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
          className={`${t3Input} flex-1 font-mono uppercase tracking-[0.2em] placeholder:font-sans placeholder:tracking-normal`}
        />
        <button type="submit" disabled={busy || !code.trim()} className={`${t3BtnPrimary} shrink-0 text-xs`}>
          {checking ? 'Checking…' : redeeming ? 'Redeeming…' : preview?.valid ? 'Redeem' : 'Apply'}
        </button>
      </form>

      {preview?.valid && !success && (
        <div className="mt-3 rounded-xl border border-[#2fbf71]/25 bg-[#2fbf71]/10 p-3">
          <p className="text-sm font-black text-[#1b1726]">
            {preview.title} · {inr(preview.amount)}
          </p>
          {preview.wagering_required > 0 && (
            <p className="mt-0.5 text-xs text-[#6b6579]">
              Credited instantly and playable. Wager {inr(preview.wagering_required)} (
              {preview.wagering_multiplier}×) to unlock it for withdrawal.
            </p>
          )}
          <p className="mt-1 text-xs font-semibold text-[#1c8a52]">Press Redeem to claim it.</p>
        </div>
      )}

      {success && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#2fbf71]/25 bg-[#2fbf71]/10 p-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1c8a52]" />
          <div>
            <p className="text-sm font-black text-[#1b1726]">
              {inr(success.amount)} added — {success.title}
            </p>
            <p className="mt-0.5 text-xs text-[#6b6579]">
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
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#e5484d]/25 bg-[#e5484d]/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c23a3e]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#c23a3e]">{error}</p>
            {preview && !preview.valid && preview.requirements?.some((r) => !r.met) && (
              <OfferRequirements offer={preview} />
            )}
          </div>
        </div>
      )}
    </T3Card>
  );
}

function BonusCard({ bonus }) {
  const required = Number(bonus.wagering_required ?? 0);
  const done = Number(bonus.wagering_completed ?? 0);
  const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 100;
  const tone = STATUS_TONE[bonus.status] ?? STATUS_TONE.expired;

  return (
    <T3Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-black text-[#1b1726]">
            {bonus.title || SOURCE_LABEL[bonus.source] || 'Bonus'}
          </h2>
          <p className="mt-0.5 text-xs text-[#9a94a8]">
            {SOURCE_LABEL[bonus.source] ?? bonus.source}
            {bonus.created_at ? ` · ${formatDate(bonus.created_at)}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-black tabular-nums text-[#9a7a24]">{inr(bonus.amount)}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wide ${tone}`}>
            {bonus.status}
          </span>
        </div>
      </div>

      {required > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#9a94a8]">
            <span>Wagering progress</span>
            <span className="tabular-nums">
              {inr(done)} / {inr(required)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Wagering progress">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#e9c56b] to-[#b8862f] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[0.65rem] text-[#9a94a8]">
            {pct}% complete
            {bonus.expires_at ? ` · expires ${formatDate(bonus.expires_at)}` : ''}
          </p>
        </div>
      )}
    </T3Card>
  );
}

// --- Claimable offers -------------------------------------------------------
// The live promotions catalogue with a one-tap claim for anything carrying a
// code. The server only lists offers inside their start/end window, and
// stamps each one with this player's claim state. An offer with claim
// conditions is shown with its progress and a *disabled* Claim button until
// every condition is met — the button is the same verdict the server would
// give, so it can never be enabled for a claim that would be refused.
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
    <T3Card className="mt-4 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#c79a3b]" />
        <h2 className="font-display text-base font-black uppercase tracking-wide text-[#1b1726]">
          Offers you can claim
        </h2>
      </div>

      <ul className="mt-3 space-y-2">
        {offers.map((offer) => (
          <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[0.06] p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#1b1726]">{offer.title}</p>
              <p className="text-xs text-[#6b6579]">
                {offer.value_type === 'percentage' ? `${offer.value_amount}% bonus` : inr(offer.value_amount)}
                {offer.min_deposit > 0 && ` · min deposit ${inr(offer.min_deposit)}`}
                {offer.wagering_multiplier > 0 && ` · ${offer.wagering_multiplier}× wagering`}
              </p>
              {offer.promo_code && (
                <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#9a94a8]">
                  {offer.promo_code}
                </p>
              )}
              {offer.end_date && (
                <p className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-[#9a94a8]">
                  <Clock className="h-3 w-3" /> Valid till {formatDate(offer.end_date)}
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
            result.ok ? 'border-[#2fbf71]/25 bg-[#2fbf71]/10' : 'border-[#e5484d]/25 bg-[#e5484d]/10'
          }`}
        >
          {result.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1c8a52]" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c23a3e]" />
          )}
          <p className={`text-sm font-semibold ${result.ok ? 'text-[#1b1726]' : 'text-[#c23a3e]'}`}>{result.message}</p>
        </div>
      )}
    </T3Card>
  );
}

// The offer's claim conditions with this player's progress against each —
// "Real balance ₹350 / ₹1,000" — so a disabled Claim button explains itself.
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
              <span className={req.met ? 'text-[#1c8a52]' : 'text-[#9a94a8]'}>
                {req.met ? <Check className="mr-1 inline h-3 w-3" /> : <Lock className="mr-1 inline h-3 w-3" />}
                {req.label}
              </span>
              <span className="tabular-nums text-[#1b1726]">
                {inr(current)} / {inr(required)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={req.label}>
              <div
                className={`h-full rounded-full transition-all ${req.met ? 'bg-[#2fbf71]' : 'bg-[#c79a3b]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// The Claim control for one offer. Three states beyond "claim now": already
// claimed, conditions not yet met (disabled with the server's reason), and
// offers that are not code-claimed at all (awarded by their trigger).
function OfferClaimButton({ offer, busy, onClaim }) {
  if (!offer.promo_code) {
    return <span className="shrink-0 text-xs font-semibold text-[#9a94a8]">Awarded automatically</span>;
  }
  if (offer.already_claimed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2fbf71]/12 px-3 py-1 text-xs font-black text-[#1c8a52]">
        <Check className="h-3.5 w-3.5" /> Claimed
      </span>
    );
  }
  // `claimable` is only present for a signed-in player; treat a missing flag
  // as claimable so the server stays the final judge.
  const locked = offer.claimable === false;
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClaim}
        disabled={busy || locked}
        title={locked ? offer.claim_blocked_reason || 'Requirements not met yet' : undefined}
        aria-disabled={busy || locked}
        className={`${t3BtnPrimary} inline-flex items-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {locked && <Lock className="h-3.5 w-3.5" />}
        {busy ? 'Claiming…' : 'Claim'}
      </button>
      {locked && (
        <span className="max-w-[220px] text-right text-[0.65rem] font-semibold text-[#9a94a8]">
          {offer.requirements_met === false
            ? 'Unlocks when the conditions are met'
            : offer.claim_blocked_reason || 'Not available right now'}
        </span>
      )}
    </div>
  );
}
