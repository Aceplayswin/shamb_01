'use client';

// Theme3 Deposit — two ways to pay in, switched by a tab at the top:
//   • Instant Deposit — same cashier flow as before: choose amount → choose
//     method → pay through the shared gateway sheet → request submitted for
//     review. The gateway step reuses <PaymentGateway/> (the app's one sandbox
//     checkout surface) as-is.
//   • Bank Transfer — the admin-configured manual methods (Backoffice →
//     Payment methods): the player picks one, sees exactly where to send the
//     money via the shared <ReceivingDetails/>, and submits the amount plus an
//     optional UTR/reference for the cashier to match.
// Either way the wallet is NOT credited on the user's action — the deposit
// stays pending until the product admin confirms it from the admin panel.
// Everything here beyond the two shared components is theme3's own cream/gold
// styling.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Smartphone, Landmark, Bitcoin, CreditCard, Wallet as WalletIcon } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { PaymentGateway } from '@/components/payments/PaymentGateway';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, hasDestination, methodDescription } from '@/lib/paymentDestination';
import { T3Card, t3Input, t3BtnPrimary, t3BtnOutline, T3FormPage } from '../components/ui';

// The "send payment to" block, restyled to VELPLAY's cream/gold card look.
// ReceivingDetails renders its own <section>, so this supplies the full card
// styling directly rather than nesting inside another T3Card.
const T3_RECEIVING_STYLES = {
  card: 'rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_20px_50px_-32px_rgba(36,27,58,0.45)]',
  title: 'font-display text-sm font-black uppercase tracking-wide text-[#1b1726]',
  note: 'mt-1 text-xs text-[#9a94a8]',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-[#faf6ec] px-4 py-3',
  label: 'text-[0.65rem] font-black uppercase tracking-wide text-[#9a94a8]',
  value: 'break-all font-bold text-[#1b1726]',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-lg border border-[#c79a3b]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#9a7a24] transition hover:border-[#c79a3b] hover:bg-[#faf6ec]',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-xl border border-black/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded-xl bg-[#faf6ec] p-3 text-xs text-[#6b6579]',
};

const METHOD_ICONS = { upi: Smartphone, bank: Landmark, crypto: Bitcoin, wallet: WalletIcon, card: CreditCard, other: Landmark };

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm', icon: Smartphone, eta: 'Instant' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer', icon: Landmark, eta: 'Instant' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification', icon: Landmark, eta: '5-30 min' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT', icon: Bitcoin, eta: '10-30 min' },
];

const STEPS = ['Amount', 'Method', 'Payment'];

export default function Theme3Deposit() {
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
    <T3FormPage title="Deposit">
      {step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {error && (
        <p className="mt-4 rounded-xl border border-[#e5484d]/30 bg-[#e5484d]/10 px-3 py-2 text-sm text-[#c23a3e]">
          {error}
        </p>
      )}

      {/* ── Step 1: Amount ── */}
      {step === 'amount' && (
        <div className="mt-6 space-y-6">
          <T3Card className="p-6">
            <label className="text-sm text-[#6b6579]">Enter Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`${t3Input} mt-2 text-2xl`}
              autoFocus
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm text-[#4a4458] shadow-sm transition hover:border-[#c79a3b]/50 hover:text-[#9a7a24]"
                >
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            {numAmount > 0 && (
              <div className="mt-4 rounded-xl border border-[#2fbf71]/25 bg-[#2fbf71]/10 p-4 text-sm text-[#1c8a52]">
                <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
                {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
                <p className="font-black">Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-[#9a94a8]">Minimum deposit ₹{MIN_DEPOSIT}.</p>
          </T3Card>

          <button
            type="button"
            onClick={() => valid && setStep('method')}
            disabled={!valid}
            className={`${t3BtnPrimary} w-full`}
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Method ── */}
      {step === 'method' && (
        <div className="mt-6 space-y-6">
          <T3Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b6579]">Depositing</span>
              <span className="text-lg font-black text-[#9a7a24]">₹{numAmount.toLocaleString('en-IN')}</span>
            </div>
            <h2 className="mt-5 text-sm font-black uppercase tracking-wide text-[#6b6579]">
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
                      active ? 'border-[#c79a3b]/60 bg-[#faf6ec]' : 'border-black/10 bg-white hover:bg-[#faf6ec]/60'
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#faf6ec] text-[#9a7a24]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[#1b1726]">{pm.label}</span>
                      <span className="block text-xs text-[#9a94a8]">{pm.desc}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[#9a94a8]">{pm.eta}</span>
                  </button>
                );
              })}
            </div>
          </T3Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('amount')} className={`${t3BtnOutline} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={startPayment}
              disabled={creating}
              className={`${t3BtnPrimary} flex-[2]`}
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
          <T3Card className="p-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-[#9a7a24]" />
            <h2 className="mt-4 text-xl font-black text-[#1b1726]">Deposit submitted</h2>
            <p className="mt-1 text-sm text-[#6b6579]">
              ₹{Number(receipt.amount).toLocaleString('en-IN')} is awaiting confirmation. Your wallet will
              be credited once our team approves the payment.
            </p>
            <div className="mt-6 space-y-2 rounded-xl border border-black/[0.06] bg-[#faf6ec] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} />
              <Row label="Reference" value={receipt.reference} />
              <Row label="Transaction ID" value={`#${transactionId}`} />
              <Row label="Status" value="Pending approval" last />
            </div>
          </T3Card>
          <div className="flex gap-3">
            <button type="button" onClick={reset} className={`${t3BtnOutline} flex-1`}>
              New deposit
            </button>
            <Link href="/wallet" className={`${t3BtnPrimary} flex-1 text-center`}>
              Go to wallet
            </Link>
          </div>
        </div>
      )}
    </T3FormPage>
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
                      ? 'bg-[#c79a3b] text-white'
                      : 'bg-[#f3ead4] text-[#9a94a8]'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1.5 text-[0.7rem] ${active ? 'font-bold text-[#1b1726]' : 'text-[#9a94a8]'}`}>
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
      <span className="text-[#9a94a8]">{label}</span>
      <span className="font-bold text-[#1b1726]">{value}</span>
    </div>
  );
}
