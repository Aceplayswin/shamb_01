'use client';

// Deposit — a cashier flow: choose amount → choose method → pay → the request
// is submitted for review. The methods, and the account the player pays into,
// come from the admin console (Cashier → Payment Methods). The pay step shows
// the block for the chosen method's TYPE — UPI: QR code + UPI ID, bank: the
// receiving account, crypto: network + wallet address — then collects the
// UTR/reference and an optional screenshot. The wallet is NOT credited on the
// user's action: the deposit stays pending until the product admin confirms it.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  Bitcoin,
  Check,
  Clock,
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { api, upload } from '@/services/api';
import { affiliateAttribution } from '@/lib/referral';
import { useAuthStore } from '@/store/auth';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, methodDescription } from '@/lib/paymentDestination';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const STEPS = ['Amount', 'Method', 'Payment'];

const TYPE_ICONS = {
  upi: Smartphone,
  bank: Landmark,
  crypto: Bitcoin,
  wallet: Wallet,
  card: CreditCard,
  other: Banknote,
};

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Theme1's glass palette for the shared "send payment to" block.
const RECEIVING_STYLES = {
  card: 'card-glass p-6',
  title: 'text-sm font-semibold uppercase tracking-wide text-slate-400',
  note: 'mt-1 text-xs text-slate-500',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-700 px-4 py-3',
  label: 'text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500',
  value: 'break-all font-medium text-white',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-brand-400 transition hover:bg-white/5',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-white/10 bg-white object-contain p-1',
  instructions:
    'mt-4 whitespace-pre-line rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300',
};

export default function Theme1Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();

  const [step, setStep] = useState('amount'); // amount | method | pay | done
  const [amount, setAmount] = useState('');
  const [methodCode, setMethodCode] = useState('');
  // UTR / reference the player copies out of their payment app, plus the
  // optional screenshot: the local File, its object-URL preview, the stored
  // URL once uploaded, and any validation/upload error.
  const [reference, setReference] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofError, setProofError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [transactionId, setTransactionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null); // { amount, reference, method }
  // One request at a time: the API refuses a new one until the admin approves
  // or rejects the open request, so the form stays locked until then.
  const [hasPending, setHasPending] = useState(false);
  const [pendingChecked, setPendingChecked] = useState(false);

  const {
    methods,
    loading: methodsLoading,
    error: methodsError,
  } = useDepositMethods(isHydrated && Boolean(token));

  const numAmount = parseFloat(amount) || 0;
  const valid = numAmount >= MIN_DEPOSIT;
  const selected = methods.find((m) => m.code === methodCode) ?? null;
  const limit = amountWithinLimits(selected, numAmount);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  const loadPending = () =>
    api('/api/v1/wallet')
      .then((w) => setHasPending(Boolean(w?.hasPendingDeposit)))
      .catch(() => {});

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

  // Preselect the first admin method; drop a selection the admin has since
  // disabled so the player cannot proceed with a method that no longer exists.
  useEffect(() => {
    if (!methods.length) {
      setMethodCode('');
      return;
    }
    if (!methods.some((m) => m.code === methodCode)) setMethodCode(methods[0].code);
  }, [methods, methodCode]);

  // A reference or screenshot belongs to one payment: changing the method
  // means that payment was never made, so start the proof over.
  useEffect(() => {
    setReference('');
    setProofFile(null);
    setProofPreview('');
    setProofUrl('');
    setProofError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [methodCode]);

  // Object URLs leak until revoked; drop the old one whenever the preview
  // changes and on unmount.
  useEffect(() => {
    if (!proofPreview) return undefined;
    return () => URL.revokeObjectURL(proofPreview);
  }, [proofPreview]);

  const stepIndex = { amount: 0, method: 1, pay: 2, done: 2 }[step];

  // Picking a file uploads it straight away, so the screenshot is already
  // stored (and validated by the server) before the deposit is submitted.
  const pickProof = async (file) => {
    if (!file) return;
    setProofError('');
    setProofUrl('');
    if (!PROOF_TYPES.includes(file.type)) {
      setProofError('Upload a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setProofError('Screenshot too large (max 5MB).');
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const res = await upload('/api/v1/wallet/deposit/proof', file);
      setProofUrl(res.url);
    } catch (e) {
      setProofError(e instanceof Error ? e.message : 'Upload failed');
      setProofFile(null);
      setProofPreview('');
    } finally {
      setUploading(false);
    }
  };

  const clearProof = () => {
    setProofFile(null);
    setProofPreview('');
    setProofUrl('');
    setProofError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // "I have paid": record the pending deposit with whatever proof the player
  // attached. Nothing is credited here — an admin reviews it first.
  const submit = async () => {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod: selected.code,
          referenceNumber: reference.trim() || null,
          paymentProofUrl: proofUrl || null,
          ...affiliateAttribution(),
        }),
      });
      setTransactionId(res.transactionId);
      setReceipt({ amount: numAmount, reference: reference.trim() || '—', method: selected.name });
      setHasPending(true);
      setStep('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not submit the deposit';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
      loadPending();
    }
  };

  const reset = () => {
    setStep('amount');
    setAmount('');
    setReference('');
    clearProof();
    setTransactionId(null);
    setReceipt(null);
    setError(null);
  };

  if (!isHydrated || !token || !pendingChecked) return null;

  // An open request (including one placed from another tab) blocks a new one
  // until an admin approves or rejects it. The receipt just submitted still
  // shows; only a fresh form is locked.
  const formLocked = hasPending && step !== 'done';

  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Deposit</h1>
      {!formLocked && step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
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

      {/* ── Step 1: Amount ── */}
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
            onClick={() => valid && setStep('method')}
            disabled={!valid}
            className="w-full rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Method (the admin's list) ── */}
      {!formLocked && step === 'method' && (
        <div className="mt-6 space-y-6">
          <section className="card-glass p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Depositing</span>
              <span className="text-lg font-bold text-gradient-gold">
                ₹{numAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Choose payment method
            </h2>

            {methodsLoading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading payment methods…
              </p>
            ) : methods.length === 0 ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                {methodsError
                  ? 'Payment methods are temporarily unavailable. Please try again shortly.'
                  : 'No payment methods are available right now. Please contact support.'}
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {methods.map((pm) => {
                  const Icon = TYPE_ICONS[pm.method_type] ?? Banknote;
                  const active = methodCode === pm.code;
                  return (
                    <button
                      key={pm.code}
                      type="button"
                      onClick={() => setMethodCode(pm.code)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                        active ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5 text-brand-400">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-white">{pm.name}</span>
                        <span className="block text-xs text-slate-500">{methodDescription(pm)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selected && !limit.ok && (
              <p className="mt-3 text-sm text-amber-400">{limit.message}</p>
            )}
          </section>

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
              onClick={() => {
                setError(null);
                setStep('pay');
              }}
              disabled={!selected || !limit.ok}
              className="flex-[2] rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-50"
            >
              Continue to pay ₹{numAmount.toLocaleString('en-IN')}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Pay (the destination for this method's type) ── */}
      {!formLocked && step === 'pay' && selected && (
        <div className="mt-6 space-y-6">
          <section className="card-glass flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold">Pay with {selected.name}</p>
              <p className="text-xs text-slate-500">Amount ₹{numAmount.toLocaleString('en-IN')}</p>
            </div>
            <span className="text-lg font-bold text-gradient-gold">
              ₹{numAmount.toLocaleString('en-IN')}
            </span>
          </section>

          <ReceivingDetails method={selected} styles={RECEIVING_STYLES} />

          <section className="card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Confirm your payment
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Pay using {selected.name}, then add the reference from your payment app. A
              screenshot helps our team approve it faster.
            </p>

            <label className="mt-4 block text-sm text-slate-400">
              UTR / transaction reference <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 412345678901"
              className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
            />

            <label className="mt-4 block text-sm text-slate-400">
              Payment screenshot <span className="text-slate-600">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => pickProof(e.target.files?.[0])}
              className="hidden"
            />
            {!proofPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/15 px-4 py-6 text-center transition hover:border-brand-500/60 hover:bg-white/[0.02]"
              >
                <Upload className="h-6 w-6 text-brand-400" />
                <span className="text-sm font-medium text-white">Tap to upload your payment screenshot</span>
                <span className="text-xs text-slate-500">PNG, JPG or WEBP · up to 5MB</span>
              </button>
            ) : (
              <div className="mt-2 rounded-xl border border-white/10 bg-surface-700 p-3">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofPreview}
                    alt="Payment screenshot preview"
                    className="h-24 w-24 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{proofFile?.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {((proofFile?.size ?? 0) / 1024).toFixed(0)} KB
                    </p>
                    {uploading && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                      </p>
                    )}
                    {proofUrl && !uploading && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
                        <Check className="h-3.5 w-3.5" /> Uploaded
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearProof}
                    aria-label="Remove screenshot"
                    className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            {proofError && <p className="mt-2 text-xs text-red-400">{proofError}</p>}
          </section>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('method')}
              className="flex-1 rounded-xl border border-white/15 py-4 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || uploading}
              className="flex-[2] rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : uploading ? 'Uploading screenshot…' : 'I have paid'}
            </button>
          </div>
        </div>
      )}

      {/* ── Done (submitted, pending admin approval) ── */}
      {step === 'done' && receipt && (
        <div className="mt-8 space-y-6">
          <section className="card-glass p-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-brand-400" />
            <h2 className="mt-4 text-xl font-bold">Deposit submitted</h2>
            <p className="mt-1 text-sm text-slate-400">
              ₹{Number(receipt.amount).toLocaleString('en-IN')} is awaiting confirmation. Your wallet
              will be credited once our team approves the payment.
            </p>
            <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} />
              <Row label="Method" value={receipt.method} />
              <Row label="Reference" value={receipt.reference} />
              <Row label="Transaction ID" value={`#${transactionId}`} />
              <Row label="Status" value="Pending approval" last />
            </div>
          </section>
          <div className="flex gap-3">
            {hasPending ? (
              <p className="flex-1 rounded-xl border border-white/10 px-4 py-4 text-center text-sm text-slate-400">
                You can place a new deposit once this one is approved or rejected.
              </p>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-xl border border-white/15 py-4 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                New deposit
              </button>
            )}
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
