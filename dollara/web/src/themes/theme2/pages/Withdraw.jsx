'use client';

// Theme2 Withdraw — same payout flow as theme1: amount → payout destination →
// review → confirmation. The amount is locked from the available balance by the
// API; funds stay held until the product admin approves or rejects the request.
// Everything here is theme2's own dark-navy/gold styling; the flow mirrors theme1.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Landmark, Smartphone, Bitcoin, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T2Card, t2Input, t2BtnPrimary, t2BtnGhost } from '../components/ui';

const MIN_WITHDRAWAL = 500;

const METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer', desc: 'NEFT / IMPS to your account', icon: Landmark },
  { id: 'upi', label: 'UPI', desc: 'Instant to your UPI ID', icon: Smartphone },
  { id: 'crypto', label: 'Crypto', desc: 'USDT (TRC20)', icon: Bitcoin },
];

const STEPS = ['Amount', 'Details', 'Review'];

export default function Theme2Withdraw() {
  const router = useRouter();
  const { token, isHydrated, hydrate, wallet, refreshSession } = useAuthStore();

  const [step, setStep] = useState('amount'); // amount | details | review | done
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [dest, setDest] = useState({ accountName: '', accountNumber: '', ifsc: '', upiId: '', address: '' });
  const [transactionId, setTransactionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const timers = useRef([]);

  const available = wallet?.available ?? 0;
  const walletBalance = wallet?.main ?? wallet?.real ?? 0;
  const heldForWithdrawal = wallet?.pendingWithdrawal ?? wallet?.locked ?? 0;
  const numAmount = parseFloat(amount) || 0;
  const amountValid = numAmount >= MIN_WITHDRAWAL && numAmount <= available;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
    else if (token) refreshSession();
  }, [isHydrated, token, router, refreshSession]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const stepIndex = { amount: 0, details: 1, review: 2, done: 2 }[step];

  const destValid = () => {
    if (method === 'bank_transfer') return dest.accountName && dest.accountNumber.length >= 6 && dest.ifsc;
    if (method === 'upi') return /.+@.+/.test(dest.upiId);
    if (method === 'crypto') return dest.address.length >= 10;
    return false;
  };

  const destSummary = () => {
    if (method === 'bank_transfer') return `${dest.accountName} · A/C ••••${dest.accountNumber.slice(-4)}`;
    if (method === 'upi') return dest.upiId;
    if (method === 'crypto') return `${dest.address.slice(0, 6)}…${dest.address.slice(-4)}`;
    return '';
  };

  const setPct = (p) => setAmount(String(Math.floor(available * p)));

  // Submit → API locks the funds and creates a PENDING withdrawal that waits for
  // admin approval. We refresh the wallet (funds now show as locked) and show the
  // submitted/pending confirmation.
  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api('/api/v1/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, paymentMethod: method }),
      });
      setTransactionId(res.transactionId);
      await refreshSession();
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep('amount');
    setAmount('');
    setDest({ accountName: '', accountNumber: '', ifsc: '', upiId: '', address: '' });
    setTransactionId(null);
    setError(null);
  };

  if (!isHydrated || !token) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Withdraw</h1>
      {step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* ── Step 1: Amount ── */}
      {step === 'amount' && (
        <div className="mt-6 space-y-6">
          <T2Card className="p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Available to withdraw</span>
              <span className="font-semibold text-emerald-400">₹{available.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`${t2Input} mt-4 text-2xl`}
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPct(p)}
                  className="flex-1 rounded-lg border border-white/5 bg-[#070d16] py-2 text-sm text-slate-200 hover:border-amber-400/40 hover:text-amber-400"
                >
                  {p === 1 ? 'Max' : `${p * 100}%`}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Minimum withdrawal ₹{MIN_WITHDRAWAL}.
              {numAmount > available && <span className="text-red-400"> Amount exceeds balance.</span>}
            </p>
          </T2Card>

          <T2Card className="p-4 text-sm">
            <h3 className="font-bold text-white">Verification Checklist</h3>
            <ul className="mt-2 space-y-1 text-slate-400">
              <li className="text-emerald-400">✓ KYC Verified</li>
              <li className="text-emerald-400">✓ Bank Account Verified</li>
              <li>⚠ Wagering Requirements (if bonus used)</li>
            </ul>
          </T2Card>

          <button
            type="button"
            onClick={() => amountValid && setStep('details')}
            disabled={!amountValid}
            className={`${t2BtnPrimary} w-full`}
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Payout details ── */}
      {step === 'details' && (
        <div className="mt-6 space-y-6">
          <T2Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payout method</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                      active
                        ? 'border-amber-400/60 bg-amber-500/10'
                        : 'border-white/5 bg-[#070d16] hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-medium text-white">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 space-y-4">
              {method === 'bank_transfer' && (
                <>
                  <Field label="Account holder name" value={dest.accountName} onChange={(v) => setDest({ ...dest, accountName: v })} placeholder="As per bank records" />
                  <Field label="Account number" value={dest.accountNumber} onChange={(v) => setDest({ ...dest, accountNumber: v })} placeholder="Bank account number" inputMode="numeric" />
                  <Field label="IFSC code" value={dest.ifsc} onChange={(v) => setDest({ ...dest, ifsc: v.toUpperCase() })} placeholder="e.g. HDFC0001234" />
                </>
              )}
              {method === 'upi' && (
                <Field label="UPI ID" value={dest.upiId} onChange={(v) => setDest({ ...dest, upiId: v })} placeholder="yourname@bank" />
              )}
              {method === 'crypto' && (
                <Field label="USDT wallet address (TRC20)" value={dest.address} onChange={(v) => setDest({ ...dest, address: v })} placeholder="T..." />
              )}
            </div>
          </T2Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('amount')} className={`${t2BtnGhost} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={() => destValid() && setStep('review')}
              disabled={!destValid()}
              className={`${t2BtnPrimary} flex-[2]`}
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 'review' && (
        <div className="mt-6 space-y-6">
          <T2Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Review withdrawal</h2>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Amount" value={`₹${numAmount.toLocaleString('en-IN')}`} />
              <Row label="Processing fee" value="₹0" />
              <Row label="Method" value={METHODS.find((m) => m.id === method)?.label} />
              <Row label="Destination" value={destSummary()} />
              <Row label="Est. time" value="2–24 hours" />
              <Row label="You'll receive" value={`₹${numAmount.toLocaleString('en-IN')}`} strong last />
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Funds are locked from your balance while we process this request.
            </p>
          </T2Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('details')} className={`${t2BtnGhost} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={`${t2BtnPrimary} flex-[2]`}
            >
              {submitting ? 'Submitting…' : 'Confirm withdrawal'}
            </button>
          </div>
        </div>
      )}

      {/* ── Done (submitted, pending admin approval) ── */}
      {step === 'done' && (
        <div className="mt-8 space-y-6">
          <T2Card className="p-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-amber-400" />
            <h2 className="mt-4 text-xl font-bold text-white">Withdrawal requested</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your request is pending approval. The amount is held from your balance and will be paid
              out once our team approves it — or returned if it&apos;s rejected.
            </p>
            <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${numAmount.toLocaleString('en-IN')}`} />
              <Row label="Method" value={METHODS.find((m) => m.id === method)?.label} />
              <Row label="Destination" value={destSummary()} />
              <Row label="Request ID" value={`#${transactionId}`} />
              <Row label="Wallet balance" value={`₹${walletBalance.toLocaleString('en-IN')}`} />
              <Row label="On hold for this request" value={`₹${heldForWithdrawal.toLocaleString('en-IN')}`} />
              <Row label="Available to play" value={`₹${available.toLocaleString('en-IN')}`} last />
            </div>
          </T2Card>
          <div className="flex gap-3">
            <button type="button" onClick={reset} className={`${t2BtnGhost} flex-1`}>
              New withdrawal
            </button>
            <Link href="/wallet" className={`${t2BtnPrimary} flex-1 text-center`}>
              Go to wallet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ steps, current }) {
  return (
    <div className="mt-6 flex items-center">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${
                  done
                    ? 'bg-emerald-500 text-black'
                    : active
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#070d16] text-slate-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1.5 text-[0.7rem] ${active ? 'text-white' : 'text-slate-500'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${i < current ? 'bg-emerald-500/60' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, inputMode }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${t2Input} mt-2`}
      />
    </div>
  );
}

function Row({ label, value, strong, last }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-white/5'}`}>
      <span className="text-slate-400">{label}</span>
      <span className={strong ? 'text-base font-bold text-amber-400' : 'font-medium text-white'}>{value}</span>
    </div>
  );
}
