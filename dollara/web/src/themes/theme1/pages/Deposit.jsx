'use client';

// Deposit — amount, then Paygate checkout (Razorpay widget). The wallet is
// credited when the gateway confirms the payment.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Clock, Loader2, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const STEPS = ['Amount', 'Payment'];

export default function Theme1Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();
  const { pay, paying, error: payError, receipt, reset: resetPay } = usePaygateDeposit();

  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [hasPending, setHasPending] = useState(false);
  const [pendingChecked, setPendingChecked] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const valid = numAmount >= MIN_DEPOSIT;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    api('/api/v1/wallet')
      .then((w) => {
        if (!cancelled) setHasPending(Boolean(w?.hasPendingDeposit));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPendingChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (receipt) setStep('done');
  }, [receipt]);

  const stepIndex = { amount: 0, pay: 1, done: 1 }[step];

  const startPay = async () => {
    setError(null);
    try {
      await pay({ amount: numAmount });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start payment';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      setError(msg);
    }
  };

  const reset = () => {
    resetPay();
    setStep('amount');
    setAmount('');
    setError(null);
  };

  if (!isHydrated || !token || !pendingChecked) return null;

  const formLocked = hasPending && step !== 'done';
  const bannerError = error || (step !== 'done' ? payError : null);

  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Deposit</h1>
      {!formLocked && step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {bannerError && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {bannerError}
        </p>
      )}

      {formLocked && (
        <section className="card-glass mt-6 p-8 text-center">
          <Clock className="mx-auto h-14 w-14 text-brand-400" />
          <h2 className="mt-4 text-xl font-bold">Deposit pending approval</h2>
          <p className="mt-2 text-sm text-slate-400">
            You already have a deposit request awaiting approval. You can place a new
            one once it has been approved or rejected.
          </p>
          <Link
            href="/wallet"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 font-semibold text-surface-900 transition hover:bg-brand-400"
          >
            Go to wallet
          </Link>
        </section>
      )}

      {!formLocked && step === 'amount' && (
        <div className="mt-6 space-y-6">
          <section className="card-glass p-6">
            <label className="text-sm text-slate-400">Enter amount</label>
            <div className="mt-2 flex items-center rounded-lg border border-white/10 bg-surface-700 px-4">
              <span className="text-2xl text-slate-500">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent px-2 py-4 text-2xl text-white outline-none"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    numAmount === a ? 'bg-brand-500 text-surface-900' : 'bg-surface-700 hover:bg-brand-500/20'
                  }`}
                >
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Minimum deposit ₹{MIN_DEPOSIT}.</p>
          </section>

          <button
            type="button"
            onClick={() => valid && setStep('pay')}
            disabled={!valid}
            className="w-full rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {!formLocked && step === 'pay' && (
        <div className="mt-6 space-y-6">
          <section className="card-glass flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold">Secure checkout</p>
              <p className="text-xs text-slate-500">Pay ₹{numAmount.toLocaleString('en-IN')}</p>
            </div>
            <span className="text-lg font-bold text-gradient-gold">
              ₹{numAmount.toLocaleString('en-IN')}
            </span>
          </section>

          {paying ? (
            <section className="card-glass p-8 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-400" />
              <p className="mt-4 text-lg font-semibold">Opening secure payment…</p>
              <p className="mt-1 text-sm text-slate-400">Do not close this window.</p>
            </section>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('amount')}
                className="flex-1 rounded-xl border border-white/15 py-4 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Back
              </button>
              <button
                type="button"
                onClick={startPay}
                className="flex-[2] rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400"
              >
                Pay ₹{numAmount.toLocaleString('en-IN')}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'done' && receipt && (
        <div className="mt-8 space-y-6">
          <section className="card-glass p-8 text-center">
            {receipt.status === 'success' ? (
              <Check className="mx-auto h-14 w-14 text-green-400" />
            ) : receipt.status === 'failed' ? (
              <X className="mx-auto h-14 w-14 text-red-400" />
            ) : (
              <Clock className="mx-auto h-14 w-14 text-brand-400" />
            )}
            <h2 className="mt-4 text-xl font-bold">
              {receipt.status === 'success'
                ? 'Deposit successful'
                : receipt.status === 'failed'
                  ? 'Payment failed'
                  : 'Payment pending'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {receipt.status === 'success'
                ? `₹${Number(receipt.amount).toLocaleString('en-IN')} has been credited to your wallet.`
                : receipt.status === 'failed'
                  ? 'The payment did not go through. You can try again.'
                  : 'Waiting for the gateway to confirm this payment.'}
            </p>
            <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} />
              <Row label="Transaction ID" value={`#${receipt.transactionId}`} />
              <Row
                label="Status"
                value={
                  receipt.status === 'success'
                    ? 'Completed'
                    : receipt.status === 'failed'
                      ? 'Failed'
                      : 'Pending'
                }
                last
              />
            </div>
          </section>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-xl border border-white/15 py-4 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              New deposit
            </button>
            <Link
              href="/wallet"
              className="flex-1 rounded-xl bg-brand-500 py-4 text-center font-semibold text-surface-900 transition hover:bg-brand-400"
            >
              Go to wallet
            </Link>
          </div>
        </div>
      )}
    </main>
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
                    ? 'bg-green-500 text-surface-900'
                    : active
                      ? 'bg-brand-500 text-surface-900'
                      : 'bg-surface-700 text-slate-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1.5 text-[0.7rem] ${active ? 'text-white' : 'text-slate-500'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${i < current ? 'bg-green-500/60' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-white/5'}`}>
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
