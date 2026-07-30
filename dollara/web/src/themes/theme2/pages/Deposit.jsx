'use client';

// Theme2 Deposit — same cashier flow as theme1: choose amount → choose method →
// pay through the shared gateway sheet → request submitted for review. The
// gateway step reuses <PaymentGateway/> (the app's one checkout surface) as-is;
// everything else here is theme2's own dark-navy/gold styling. The wallet is NOT
// credited on the user's action — the deposit stays pending until the product
// admin confirms it from the admin panel.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Smartphone, Landmark, Bitcoin } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { PaymentGateway } from '@/components/payments/PaymentGateway';
import { T2Card, t2Input, t2BtnPrimary, t2BtnGhost } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm', icon: Smartphone, eta: 'Instant' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer', icon: Landmark, eta: 'Instant' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification', icon: Landmark, eta: '5-30 min' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT', icon: Bitcoin, eta: '10-30 min' },
];

const STEPS = ['Amount', 'Method', 'Payment'];

export default function Theme2Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();

  const [step, setStep] = useState('amount'); // amount | method | pay | done
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null); // { amount, reference }

  const numAmount = parseFloat(amount) || 0;
  const valid = numAmount >= MIN_DEPOSIT;
  const bonus = numAmount >= 1000 ? numAmount * 0.5 : 0;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  const stepIndex = { amount: 0, method: 1, pay: 2, done: 2 }[step];

  // Create the pending deposit (the "order") before opening the gateway.
  const startPayment = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, paymentMethod: method }),
      });
      setTransactionId(res.transactionId);
      setStep('pay');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start payment';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Called by the gateway once the user completes "payment". This does NOT
  // credit the wallet — it just records the reference the user supplied so the
  // admin can match it. The deposit created in startPayment stays pending until
  // an admin confirms it.
  const confirmPayment = async (reference) => {
    setReceipt({ amount: numAmount, reference });
    setStep('done');
  };

  const reset = () => {
    setStep('amount');
    setAmount('');
    setMethod('upi');
    setTransactionId(null);
    setReceipt(null);
    setError(null);
  };

  if (!isHydrated || !token) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Deposit</h1>
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
            <label className="text-sm text-slate-400">Enter Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`${t2Input} mt-2 text-2xl`}
              autoFocus
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className="rounded-lg border border-white/5 bg-[#070d16] px-4 py-2 text-sm text-slate-200 hover:border-amber-400/40 hover:text-amber-400"
                >
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            {numAmount > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
                {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
                <p className="font-semibold text-emerald-400">
                  Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}
                </p>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Minimum deposit ₹{MIN_DEPOSIT}.</p>
          </T2Card>

          <button
            type="button"
            onClick={() => valid && setStep('method')}
            disabled={!valid}
            className={`${t2BtnPrimary} w-full`}
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Method ── */}
      {step === 'method' && (
        <div className="mt-6 space-y-6">
          <T2Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Depositing</span>
              <span className="text-lg font-bold text-amber-400">₹{numAmount.toLocaleString('en-IN')}</span>
            </div>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Choose payment method
            </h2>
            <div className="mt-4 space-y-2">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon;
                const active = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMethod(pm.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                      active
                        ? 'border-amber-400/60 bg-amber-500/10'
                        : 'border-white/5 bg-[#070d16] hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-white">{pm.label}</span>
                      <span className="block text-xs text-slate-500">{pm.desc}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{pm.eta}</span>
                  </button>
                );
              })}
            </div>
          </T2Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('amount')} className={`${t2BtnGhost} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={startPayment}
              disabled={creating}
              className={`${t2BtnPrimary} flex-[2]`}
            >
              {creating ? 'Starting…' : `Proceed to pay ₹${numAmount.toLocaleString('en-IN')}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Payment (shared gateway) ── */}
      {step === 'pay' && (
        <div className="mt-6">
          <PaymentGateway
            amount={numAmount}
            method={method}
            onConfirm={confirmPayment}
            onCancel={() => setStep('method')}
          />
        </div>
      )}

      {/* ── Done (submitted, pending admin approval) ── */}
      {step === 'done' && receipt && (
        <div className="mt-8 space-y-6">
          <T2Card className="p-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-amber-400" />
            <h2 className="mt-4 text-xl font-bold text-white">Deposit submitted</h2>
            <p className="mt-1 text-sm text-slate-400">
              ₹{Number(receipt.amount).toLocaleString('en-IN')} is awaiting confirmation. Your wallet will
              be credited once our team approves the payment.
            </p>
            <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} />
              <Row label="Reference" value={receipt.reference} />
              <Row label="Transaction ID" value={`#${transactionId}`} />
              <Row label="Status" value="Pending approval" last />
            </div>
          </T2Card>
          <div className="flex gap-3">
            <button type="button" onClick={reset} className={`${t2BtnGhost} flex-1`}>
              New deposit
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

function Row({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-white/5'}`}>
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
