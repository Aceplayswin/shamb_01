'use client';

// Theme4 My Bonuses — the player's own awarded bonus ledger and wagering
// progress (/api/v1/bonuses/mine), teal exchange style. Deliberately separate
// from /promotions, which is the public poster catalogue anyone can browse:
// this page is "what I hold", that page is "what's on offer". A coupon-code
// redemption box and the live claimable-offers list both live here, since
// claiming needs an authenticated wallet to credit.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gift, Sparkles, Ticket, Check, AlertCircle, Lock, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime as formatDate } from '@/lib/datetime';
import { useCouponRedeem } from '@/hooks/useCouponRedeem';
import { T4Card, t4BtnPrimary, t4Input, T4FormPage } from '../components/ui';

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
// withdrawable real balance. `pending` is retained for legacy rows written
// under the old model.
const STATUS_TONE = {
  active: 'bg-[#1c8a52]/10 text-[#1c8a52]',
  pending: 'bg-[#b45309]/10 text-[#b45309]',
  completed: 'bg-[#0e7480]/10 text-[#0e7480]',
  expired: 'bg-black/[0.06] text-[#8aa0a4]',
  forfeited: 'bg-[#e5342c]/10 text-[#e5342c]',
};

export default function Theme4Bonus() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  // Offers the player can still claim, so this page can hand them the bonus
  // instead of pointing at a promotions page that only shows posters. Each row
  // carries this player's claim state from the server.
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
    <T4FormPage title="My Bonuses" subtitle="Bonus credits you hold and their wagering progress." maxWidth="max-w-2xl">
      <RedeemCoupon onRedeemed={onRedeemed} />

      <AvailableOffers offers={offers} onClaimed={onRedeemed} />

      {/* Bonus vs real money — the distinction that decides what is withdrawable */}
      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <T4Card className="p-5">
          <p className="text-[0.6rem] font-black uppercase tracking-wide text-[#8aa0a4]">Bonus balance</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-[#13272b]">{inr(wallet?.bonus)}</p>
          <p className="mt-1 text-xs text-[#5d7378]">
            Playable now · becomes withdrawable once wagering is cleared
          </p>
        </T4Card>
        <T4Card className="p-5">
          <p className="text-[0.6rem] font-black uppercase tracking-wide text-[#1c8a52]">Real balance</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-[#13272b]">
            {inr(wallet?.real ?? wallet?.main)}
          </p>
          <p className="mt-1 text-xs text-[#5d7378]">Yours to withdraw any time</p>
        </T4Card>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/promotions" className={`${t4BtnPrimary} inline-flex items-center gap-1.5 text-xs`}>
          <Sparkles className="h-4 w-4" /> Browse promotions
        </Link>
        {!loading && (
          <span className="text-xs font-semibold text-[#8aa0a4]">
            {activeCount} active bonus{activeCount === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      <section className="mt-4 space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => <T4Card key={i} className="h-28 animate-pulse" />)
        ) : bonuses.length === 0 ? (
          <T4Card className="flex flex-col items-center gap-2 p-12 text-center">
            <Gift className="h-8 w-8 text-[#0e7480]" />
            <p className="font-display text-lg font-black text-[#13272b]">No bonuses yet</p>
            <p className="text-sm text-[#5d7378]">
              Claim an offer from the promotions page to get started.
            </p>
          </T4Card>
        ) : (
          bonuses.map((b) => <BonusCard key={b.id} bonus={b} />)
        )}
      </section>
    </T4FormPage>
  );
}

// --- Coupon redemption ------------------------------------------------------
// The player types a code the operator handed out (banner, message, campaign);
// redeeming credits that campaign's reward to this account, once per player.
// Applying first (preview) then redeeming means a mistyped code never burns
// the player's single attempt at a campaign.
function RedeemCoupon({ onRedeemed }) {
  const { code, onCodeChange, check, redeem, checking, redeeming, preview, error, success, busy } =
    useCouponRedeem({ onRedeemed });

  const submit = (e) => {
    e.preventDefault();
    if (preview?.valid) redeem();
    else check();
  };

  return (
    <T4Card className="mt-6 p-5">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-[#0e7480]" />
        <h2 className="font-display text-base font-black uppercase tracking-wide text-[#13272b]">
          Redeem a coupon code
        </h2>
      </div>
      <p className="mt-1 text-xs text-[#5d7378]">
        Got a code? Enter it below to add the bonus to your account. Each code can be
        redeemed once per player.
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
          className={`${t4Input} flex-1 font-mono uppercase tracking-[0.2em] placeholder:font-sans placeholder:tracking-normal`}
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className={`${t4BtnPrimary} shrink-0 text-xs disabled:cursor-not-allowed`}
        >
          {checking ? 'Checking…' : redeeming ? 'Redeeming…' : preview?.valid ? 'Redeem' : 'Apply'}
        </button>
      </form>

      {/* What the code is worth, shown before the player commits to it. */}
      {preview?.valid && !success && (
        <div className="mt-3 rounded border border-[#1c8a52]/25 bg-[#1c8a52]/[0.07] p-3">
          <p className="text-sm font-black text-[#13272b]">
            {preview.title} · {inr(preview.amount)}
          </p>
          {preview.wagering_required > 0 && (
            <p className="mt-0.5 text-xs text-[#5d7378]">
              Credited instantly and playable. Wager {inr(preview.wagering_required)} (
              {preview.wagering_multiplier}×) to unlock it for withdrawal.
            </p>
          )}
          <p className="mt-1 text-xs font-semibold text-[#1c8a52]">Press Redeem to claim it.</p>
        </div>
      )}

      {success && (
        <div className="mt-3 flex items-start gap-2 rounded border border-[#1c8a52]/25 bg-[#1c8a52]/[0.07] p-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1c8a52]" />
          <div>
            <p className="text-sm font-black text-[#13272b]">
              {inr(success.amount)} added — {success.title}
            </p>
            <p className="mt-0.5 text-xs text-[#5d7378]">
              {success.withdrawable
                ? 'Credited to your withdrawable balance.'
                : `Added to your bonus balance — play with it now. Complete ${inr(success.wagering_required)} of wagering to make it withdrawable.`}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded border border-[#e5342c]/25 bg-[#e5342c]/[0.07] p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e5342c]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#c0342c]">{error}</p>
            {/* A code refused for unmet conditions: show how far off the
                player is, the same way the offer list does. */}
            {preview && !preview.valid && preview.requirements?.some((r) => !r.met) && (
              <OfferRequirements offer={preview} />
            )}
          </div>
        </div>
      )}
    </T4Card>
  );
}

function BonusCard({ bonus }) {
  const required = Number(bonus.wagering_required ?? 0);
  const done = Number(bonus.wagering_completed ?? 0);
  const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 100;
  const tone = STATUS_TONE[bonus.status] ?? STATUS_TONE.expired;

  return (
    <T4Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-black text-[#13272b]">
            {bonus.title || SOURCE_LABEL[bonus.source] || 'Bonus'}
          </h2>
          <p className="mt-0.5 text-xs text-[#5d7378]">
            {SOURCE_LABEL[bonus.source] ?? bonus.source}
            {bonus.created_at ? ` · ${formatDate(bonus.created_at)}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-black tabular-nums text-[#0e7480]">{inr(bonus.amount)}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wide ${tone}`}>
            {bonus.status}
          </span>
        </div>
      </div>

      {required > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5d7378]">
            <span>Wagering progress</span>
            <span className="tabular-nums">
              {inr(done)} / {inr(required)}
            </span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.07]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Wagering progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#17a2b0] to-[#0e7480] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[0.65rem] text-[#8aa0a4]">
            {pct}% complete
            {bonus.expires_at ? ` · expires ${formatDate(bonus.expires_at)}` : ''}
          </p>
        </div>
      )}
    </T4Card>
  );
}

// --- Claimable offers -------------------------------------------------------
// The live promotions catalogue with a one-tap claim for anything carrying a
// code. The server only lists offers inside their start/end window, and
// stamps each one with this player's claim state. An offer with claim
// conditions (a real balance to hold, an amount to wager or deposit during the
// offer) is shown with its progress and a *disabled* Claim button until every
// condition is met — the button is the same verdict the server would give.
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
    <T4Card className="mt-4 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#0e7480]" />
        <h2 className="font-display text-base font-black uppercase tracking-wide text-[#13272b]">
          Offers you can claim
        </h2>
      </div>

      <ul className="mt-3 space-y-2">
        {offers.map((offer) => (
          <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-black/[0.06] p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#13272b]">{offer.title}</p>
              <p className="text-xs text-[#5d7378]">
                {offer.value_type === 'percentage' ? `${offer.value_amount}% bonus` : inr(offer.value_amount)}
                {offer.min_deposit > 0 && ` · min deposit ${inr(offer.min_deposit)}`}
                {offer.wagering_multiplier > 0 && ` · ${offer.wagering_multiplier}× wagering`}
              </p>
              {offer.promo_code && (
                <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#8aa0a4]">
                  {offer.promo_code}
                </p>
              )}
              {offer.end_date && (
                <p className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-[#8aa0a4]">
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
          className={`mt-3 flex items-start gap-2 rounded border p-3 ${
            result.ok ? 'border-[#1c8a52]/25 bg-[#1c8a52]/[0.07]' : 'border-[#e5342c]/25 bg-[#e5342c]/[0.07]'
          }`}
        >
          {result.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1c8a52]" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e5342c]" />
          )}
          <p className={`text-sm font-semibold ${result.ok ? 'text-[#13272b]' : 'text-[#c0342c]'}`}>{result.message}</p>
        </div>
      )}
    </T4Card>
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
              <span className={req.met ? 'text-[#1c8a52]' : 'text-[#8aa0a4]'}>
                {req.met ? <Check className="mr-1 inline h-3 w-3" /> : <Lock className="mr-1 inline h-3 w-3" />}
                {req.label}
              </span>
              <span className="tabular-nums text-[#13272b]">
                {inr(current)} / {inr(required)}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.07]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={req.label}
            >
              <div
                className={`h-full rounded-full transition-all ${req.met ? 'bg-[#1c8a52]' : 'bg-[#0e7480]'}`}
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
// claimed, conditions not yet met (disabled, with the server's reason), and
// offers that are not code-claimed at all (awarded by their trigger).
function OfferClaimButton({ offer, busy, onClaim }) {
  if (!offer.promo_code) {
    return <span className="shrink-0 text-xs font-semibold text-[#8aa0a4]">Awarded automatically</span>;
  }
  if (offer.already_claimed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1c8a52]/10 px-3 py-1 text-xs font-black text-[#1c8a52]">
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
        className={`${t4BtnPrimary} inline-flex items-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {locked && <Lock className="h-3.5 w-3.5" />}
        {busy ? 'Claiming…' : 'Claim'}
      </button>
      {locked && (
        <span className="max-w-[220px] text-right text-[0.65rem] font-semibold text-[#8aa0a4]">
          {offer.requirements_met === false ? 'Unlocks when the conditions are met' : offer.claim_blocked_reason || 'Not available right now'}
        </span>
      )}
    </div>
  );
}
