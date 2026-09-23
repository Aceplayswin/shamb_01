'use client';

// Theme2 Deposit — two channels, one amount step:
//   • Quick Pay   — the original cashier flow: choose amount → choose a generic
//     method → pay through the shared sandbox gateway sheet. Untouched.
//   • Direct Transfer — the admin's real, per-method receiving accounts
//     (useDepositMethods) rendered through the shared <ReceivingDetails/> (QR /
//     UPI ID / bank account / crypto address, per method type). The player pays
//     outside the app, then submits the UTR/reference here for review.
// Either way the wallet is NOT credited on the user's action — the deposit
// stays pending until the product admin confirms it from the admin panel.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Smartphone, Landmark, Bitcoin, Send, QrCode } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { PaymentGateway } from '@/components/payments/PaymentGateway';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, methodDescription, TYPE_LABELS } from '@/lib/paymentDestination';
import { T2Card, t2Input, t2BtnPrimary, t2BtnGhost } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm', icon: Smartphone, eta: 'Instant' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer', icon: Landmark, eta: 'Instant' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification', icon: Landmark, eta: '5-30 min' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT', icon: Bitcoin, eta: '10-30 min' },
];

// theme2's dark-navy/gold skin for the shared <ReceivingDetails/> block. The QR
// frame stays white — the code itself needs light-on-dark contrast to scan,
// regardless of the site's own palette.
const RECEIVING_STYLES = {
  card: 'mt-4 rounded-xl border border-white/5 bg-[#070d16] p-5',
  title: 'font-display font-black text-white',
  note: 'mt-1 text-xs text-slate-400',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#0d1420] px-4 py-3',
  label: 'text-[0.65rem] font-bold uppercase tracking-wide text-slate-500',
  value: 'break-all font-semibold text-white',
  mono: 'font-mono text-sm',
  copyBtn: 'shrink-0 rounded-md border border-white/10 px-3 py-1.5 text-xs font-bold text-amber-400 transition hover:border-amber-400/50',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-white/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded-lg bg-white/5 p-3 text-xs text-slate-300',
};

const CHANNELS = [
  { id: 'gateway', label: 'Quick Pay', icon: Smartphone, blurb: 'Sandbox checkout' },
  { id: 'direct', label: 'Direct Transfer', icon: QrCode, blurb: "Pay to the admin's account" },
];

const STEPS = { gateway: ['Amount', 'Method', 'Payment'], direct: ['Amount', 'Method', 'Transfer'] };

export default function Theme2Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();

  const [channel, setChannel] = useState('gateway'); // gateway | direct
  const [step, setStep] = useState('amount'); // amount | method | pay | transfer | done
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi'); // gateway channel's generic method id
  const [transactionId, setTransactionId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null); // { amount, reference }

  // Direct-transfer channel: the admin's own configured payment methods, with
  // the account/QR the player actually pays into.
  const { methods: directMethods, loading: directMethodsLoading, error: directMethodsError } =
    useDepositMethods(Boolean(token));
  const [directMethodId, setDirectMethodId] = useState(null);
  const [reference, setReference] = useState('');
  const selectedDirectMethod = useMemo(
    () => directMethods.find((m) => m.id === directMethodId) ?? null,
    [directMethods, directMethodId],
  );

  const numAmount = parseFloat(amount) || 0;
  const valid = numAmount >= MIN_DEPOSIT;
  const bonus = numAmount >= 1000 ? numAmount * 0.5 : 0;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  const stepIndex = { amount: 0, method: 1, pay: 2, transfer: 2, done: 2 }[step];

  const changeChannel = (next) => {
    if (next === channel) return;
    setChannel(next);
    setMethod('upi');
    setDirectMethodId(null);
    setReference('');
    setError(null);
  };

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
  const confirmPayment = async (ref) => {
    setReceipt({ amount: numAmount, reference: ref });
    setStep('done');
  };

  // Direct transfer: the player has already paid into the account shown on the
  // Transfer step outside this app. One call both records the deposit and
  // attaches the reference they typed — there is no gateway "confirm" leg here.
  const submitDirectTransfer = async () => {
    if (!selectedDirectMethod || !reference.trim()) return;
    setError(null);
    setCreating(true);
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod: selectedDirectMethod.code || selectedDirectMethod.name,
          referenceNumber: reference.trim(),
        }),
      });
      setTransactionId(res.transactionId);
      setReceipt({ amount: numAmount, reference: reference.trim() });
      setStep('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not submit this deposit';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const reset = () => {
    setStep('amount');
    setAmount('');
    setMethod('upi');
    setDirectMethodId(null);
    setReference('');
    setTransactionId(null);
    setReceipt(null);
    setError(null);
  };

  if (!isHydrated || !token) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Deposit</h1>

      {/* ── Channel switcher — locked in once amount/method are committed ── */}
      {(step === 'amount' || step === 'method') && (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-[#0d1420] p-1.5">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const active = channel === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => changeChannel(c.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                  active
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {step !== 'done' && <Stepper steps={STEPS[channel]} current={stepIndex} />}

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
      {step === 'method' && channel === 'gateway' && (
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

      {/* ── Step 2 (direct channel): pick the admin's own receiving account ── */}
      {step === 'method' && channel === 'direct' && (
        <div className="mt-6 space-y-6">
          <T2Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Depositing</span>
              <span className="text-lg font-bold text-amber-400">₹{numAmount.toLocaleString('en-IN')}</span>
            </div>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Choose a receiving account
            </h2>

            {directMethodsLoading ? (
              <div className="mt-4 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : directMethodsError ? (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {directMethodsError}
              </p>
            ) : directMethods.length === 0 ? (
              <p className="mt-4 rounded-xl border border-white/5 bg-[#070d16] px-4 py-6 text-center text-sm text-slate-500">
                No direct-transfer accounts are configured right now. Use Quick Pay instead.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {directMethods.map((m) => {
                  const active = directMethodId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDirectMethodId(m.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                        active
                          ? 'border-amber-400/60 bg-amber-500/10'
                          : 'border-white/5 bg-[#070d16] hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-400">
                        <QrCode className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-white">{m.name}</span>
                        <span className="block text-xs text-slate-500">{methodDescription(m)}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-slate-400">
                        {TYPE_LABELS[m.method_type] ?? m.method_type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedDirectMethod && !amountWithinLimits(selectedDirectMethod, numAmount).ok && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {amountWithinLimits(selectedDirectMethod, numAmount).message}
              </p>
            )}
          </T2Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('amount')} className={`${t2BtnGhost} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep('transfer')}
              disabled={!selectedDirectMethod || !amountWithinLimits(selectedDirectMethod, numAmount).ok}
              className={`${t2BtnPrimary} flex-[2]`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 (gateway channel): shared sandbox gateway ── */}
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

      {/* ── Step 3 (direct channel): pay outside the app, then tell us the UTR ── */}
      {step === 'transfer' && selectedDirectMethod && (
        <div className="mt-6 space-y-6">
          <T2Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Depositing</span>
              <span className="text-lg font-bold text-amber-400">₹{numAmount.toLocaleString('en-IN')}</span>
            </div>
            <ReceivingDetails method={selectedDirectMethod} styles={RECEIVING_STYLES} />

            <label className="mt-5 block text-sm text-slate-400">
              UTR / Transaction reference
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Paste the reference from your payment app"
                className={`${t2Input} mt-2`}
              />
            </label>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Send className="h-3.5 w-3.5" /> Pay the exact amount shown above, then submit the reference so
              our team can match it.
            </p>
          </T2Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('method')} className={`${t2BtnGhost} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={submitDirectTransfer}
              disabled={creating || !reference.trim()}
              className={`${t2BtnPrimary} flex-[2]`}
            >
              {creating ? 'Submitting…' : "I've paid — submit for review"}
            </button>
          </div>
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
