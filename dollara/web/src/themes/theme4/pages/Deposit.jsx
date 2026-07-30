'use client';

// Theme4 Deposit — same cashier flow as theme1: choose amount → choose method →
// pay through the shared gateway sheet → request submitted for review. The
// gateway step reuses <PaymentGateway/> (the app's one checkout surface) as-is;
// everything else here is theme4's own teal styling. The wallet is NOT credited
// on the user's action — the deposit stays pending until the product admin
// confirms it from the admin panel.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Smartphone, Landmark, Bitcoin } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { PaymentGateway } from '@/components/payments/PaymentGateway';
import { T4Card, t4Input, t4BtnPrimary, t4BtnOutline, T4FormPage } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm', icon: Smartphone, eta: 'Instant' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer', icon: Landmark, eta: 'Instant' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification', icon: Landmark, eta: '5-30 min' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT', icon: Bitcoin, eta: '10-30 min' },
];

const STEPS = ['Amount', 'Method', 'Payment'];

export default function Theme4Deposit() {
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
    <T4FormPage title="Deposit">
      {step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {error && (
        <p className="mt-4 rounded border border-[#e5342c]/30 bg-[#e5342c]/10 px-3 py-2 text-sm text-[#c0342c]">
          {error}
        </p>
      )}

      {/* ── Step 1: Amount ── */}
      {step === 'amount' && (
        <div className="mt-6 space-y-6">
          <T4Card className="p-6">
            <label className="text-sm text-[#5d7378]">Enter Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`${t4Input} mt-2 text-2xl`}
              autoFocus
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className="rounded border border-[#0e7480]/25 bg-white px-4 py-2 text-sm text-[#13272b] shadow-sm transition hover:border-[#0e7480] hover:text-[#0e7480]"
                >
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            {numAmount > 0 && (
              <div className="mt-4 rounded border border-[#2fbf71]/25 bg-[#2fbf71]/10 p-4 text-sm text-[#1c8a52]">
                <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
                {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
                <p className="font-black">Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-[#8aa0a4]">Minimum deposit ₹{MIN_DEPOSIT}.</p>
          </T4Card>

          <button
            type="button"
            onClick={() => valid && setStep('method')}
            disabled={!valid}
            className={`${t4BtnPrimary} w-full`}
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Method ── */}
      {step === 'method' && (
        <div className="mt-6 space-y-6">
          <T4Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#5d7378]">Depositing</span>
              <span className="text-lg font-black text-[#0e7480]">
                ₹{numAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <h2 className="mt-5 text-sm font-black uppercase tracking-wide text-[#5d7378]">
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
                    className={`flex w-full items-center gap-3 rounded border p-4 text-left transition ${
                      active ? 'border-[#0e7480] bg-[#eef6f7]' : 'border-black/10 bg-white hover:bg-[#f7fafa]'
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[#eef6f7] text-[#0e7480]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[#13272b]">{pm.label}</span>
                      <span className="block text-xs text-[#8aa0a4]">{pm.desc}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[#8aa0a4]">{pm.eta}</span>
                  </button>
                );
              })}
            </div>
          </T4Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('amount')} className={`${t4BtnOutline} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={startPayment}
              disabled={creating}
              className={`${t4BtnPrimary} flex-[2]`}
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
          <T4Card className="p-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-[#0e7480]" />
            <h2 className="mt-4 text-xl font-black text-[#13272b]">Deposit submitted</h2>
            <p className="mt-1 text-sm text-[#5d7378]">
              ₹{Number(receipt.amount).toLocaleString('en-IN')} is awaiting confirmation. Your wallet will
              be credited once our team approves the payment.
            </p>
            <div className="mt-6 space-y-2 rounded border border-black/[0.06] bg-[#f7fafa] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} />
              <Row label="Reference" value={receipt.reference} />
              <Row label="Transaction ID" value={`#${transactionId}`} />
              <Row label="Status" value="Pending approval" last />
            </div>
          </T4Card>
          <div className="flex gap-3">
            <button type="button" onClick={reset} className={`${t4BtnOutline} flex-1`}>
              New deposit
            </button>
            <Link href="/wallet" className={`${t4BtnPrimary} flex-1 text-center`}>
              Go to wallet
            </Link>
          </div>
        </div>
      )}
    </T4FormPage>
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
                    ? 'bg-[#2fbf71] text-white'
                    : active
                      ? 'bg-[#0e7480] text-white'
                      : 'bg-[#eef1f2] text-[#8aa0a4]'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1.5 text-[0.7rem] ${active ? 'font-bold text-[#13272b]' : 'text-[#8aa0a4]'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${i < current ? 'bg-[#2fbf71]/60' : 'bg-black/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-black/[0.06]'}`}>
      <span className="text-[#8aa0a4]">{label}</span>
      <span className="font-bold text-[#13272b]">{value}</span>
    </div>
  );
}
