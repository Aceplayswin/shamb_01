'use client';

// Deposit — a cashier flow: choose amount → choose method → pay through the
// gateway sheet → the request is submitted for review. The payment step is
// handled by the shared <PaymentGateway/> (sandbox today; real provider plugs in
// there). The wallet is NOT credited on the user's action — the deposit stays
// pending until the product admin confirms it from the admin panel.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Smartphone, Landmark, CreditCard, Bitcoin, Upload, X, Check, Loader2 } from 'lucide-react';
import { api, upload } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { PaymentGateway } from '@/components/payments/PaymentGateway';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, hasDestination, methodDescription } from '@/lib/paymentDestination';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm', icon: Smartphone, eta: 'Instant' },
  { id: 'card', label: 'Debit / Credit Card', desc: 'Visa, Mastercard, RuPay', icon: CreditCard, eta: 'Instant' },
  { id: 'netbanking', label: 'Net Banking', desc: 'All major banks', icon: Landmark, eta: '1-5 min' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'USDT, BTC, ETH', icon: Bitcoin, eta: '10-30 min' },
];

const STEPS = ['Amount', 'Method', 'Payment'];

// ---- Manual "Bank Transfer" tab (admin-configured methods) ----
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Theme1 (dark glass) palette for the shared "send payment to" block. The
// outer card is a plain card-glass section wrapped around it, so `card` stays
// empty here to avoid a double border/background.
const RECEIVING_STYLES = {
  card: '',
  title: 'font-semibold text-white',
  note: 'mt-1 text-xs text-slate-500',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-surface-700 px-4 py-3',
  label: 'text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500',
  value: 'break-all font-medium text-white',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-brand-400 transition hover:border-brand-400/60 hover:bg-brand-500/10',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-white/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded-lg bg-white/[0.03] p-3 text-xs text-slate-300',
};

export default function Theme1Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();

  const [step, setStep] = useState('amount'); // amount | method | pay | done
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null); // { credited, reference }
  // Which deposit flow is shown: the existing sandbox gateway (default,
  // unchanged) or the admin-configured manual bank/UPI transfer added below.
  const [depositTab, setDepositTab] = useState('instant'); // instant | manual

  const numAmount = parseFloat(amount) || 0;
  const valid = numAmount >= MIN_DEPOSIT;

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
    <main className="mx-auto max-w-xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Deposit</h1>

      {/* Method switcher — the sandbox gateway stays the default, unchanged
          flow; Bank Transfer is the admin-configured manual option (real
          payment methods, proof upload, reviewed by the cashier). */}
      <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-surface-700 p-1">
        <button
          type="button"
          onClick={() => setDepositTab('instant')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            depositTab === 'instant' ? 'bg-brand-500 text-surface-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          Instant Deposit
        </button>
        <button
          type="button"
          onClick={() => setDepositTab('manual')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            depositTab === 'manual' ? 'bg-brand-500 text-surface-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          Bank Transfer
        </button>
      </div>

      {depositTab === 'manual' ? (
        <ManualDeposit />
      ) : (
      <>
      {step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* ── Step 1: Amount ── */}
      {step === 'amount' && (
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

      {/* ── Step 2: Method ── */}
      {step === 'method' && (
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
                      active ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-brand-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-white">{pm.label}</span>
                      <span className="block text-xs text-slate-500">{pm.desc}</span>
                    </span>
                    <span className="text-xs text-slate-500">{pm.eta}</span>
                  </button>
                );
              })}
            </div>
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
              onClick={startPayment}
              disabled={creating}
              className="flex-[2] rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-50"
            >
              {creating ? 'Starting…' : `Proceed to pay ₹${numAmount.toLocaleString('en-IN')}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Payment (gateway) ── */}
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
          <section className="card-glass p-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-brand-400" />
            <h2 className="mt-4 text-xl font-bold">Deposit submitted</h2>
            <p className="mt-1 text-sm text-slate-400">
              ₹{Number(receipt.amount).toLocaleString('en-IN')} is awaiting confirmation. Your wallet
              will be credited once our team approves the payment.
            </p>
            <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} />
              <Row label="Reference" value={receipt.reference} />
              <Row label="Transaction ID" value={`#${transactionId}`} />
              <Row label="Status" value="Pending approval" last />
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
      </>
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

// ── Manual "Bank Transfer" tab ──────────────────────────────────────────────
// Same data flow as the other themes' manual deposit: methods come from the
// admin console (Cashier → Payment Methods), each carrying the destination
// the player pays into. The player pays out of band from their own
// UPI/bank/crypto app, then uploads a screenshot as proof — nothing is
// credited here, an admin reviews the proof and approves the deposit. Rendered
// by <Theme1Deposit/> above when depositTab === 'manual'; the sandbox stepper
// flow (PaymentGateway) is untouched.
function ManualDeposit() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  // UTR / reference the player copies out of their payment app.
  const [reference, setReference] = useState('');
  const [submitError, setSubmitError] = useState('');
  // Payment screenshot: the local File, its object-URL preview, the uploaded
  // URL once stored, and any validation/upload error.
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofError, setProofError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  // Methods the admin has configured, each carrying the account the player
  // pays into. No static fallback: an empty list is shown as unavailable.
  // (Theme1Deposit already guards on token/hydration before this renders.)
  const { methods, loading: methodsLoading, error: methodsError } = useDepositMethods();

  const numAmount = parseFloat(amount) || 0;
  const selectedMethod = methods.find((pm) => pm.code === method) ?? null;
  // Every admin-configured method is paid manually, so proof is always asked
  // for once a method is chosen.
  const needsProof = Boolean(selectedMethod);
  const limit = amountWithinLimits(selectedMethod, numAmount);

  // A method the admin has since disabled must not stay selected.
  useEffect(() => {
    if (method && !methods.some((pm) => pm.code === method)) setMethod('');
  }, [methods, method]);

  // A reference or screenshot belongs to one payment: changing the method
  // means that payment was never made, so the proof starts over.
  useEffect(() => {
    setReference('');
    setSubmitError('');
    setProofFile(null);
    setProofPreview('');
    setProofUrl('');
    setProofError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [method]);

  // Object URLs are leaked memory until revoked; drop the old one whenever the
  // preview changes and on unmount.
  useEffect(() => {
    if (!proofPreview) return undefined;
    return () => URL.revokeObjectURL(proofPreview);
  }, [proofPreview]);

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

  const submit = async () => {
    if (!selectedMethod) return;
    setLoading(true);
    setSubmitError('');
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod: selectedMethod.code,
          referenceNumber: reference.trim() || null,
          paymentProofUrl: proofUrl || null,
        }),
      });
      setResult(res);
      // Clear the form: the request is queued and the same screenshot must not
      // be submitted again by accident.
      setAmount('');
      setReference('');
      clearProof();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading &&
    !uploading &&
    numAmount > 0 &&
    Boolean(selectedMethod) &&
    limit.ok &&
    (!needsProof || Boolean(proofUrl));

  return (
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
      </section>

      <section className="card-glass p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payment method</h2>
        {methodsLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading payment methods…</p>
        ) : methods.length === 0 ? (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
            {methodsError
              ? 'Payment methods are temporarily unavailable. Please try again shortly.'
              : 'No payment methods are available right now. Please contact support.'}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {methods.map((pm) => {
              const active = method === pm.code;
              return (
                <button
                  key={pm.code}
                  type="button"
                  onClick={() => setMethod(pm.code)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                    active ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <span>
                    <span className="block font-medium text-white">{pm.name}</span>
                    <span className="block text-xs text-slate-500">{methodDescription(pm)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {selectedMethod && numAmount > 0 && !limit.ok && (
          <p className="mt-3 text-sm font-semibold text-amber-400">{limit.message}</p>
        )}
      </section>

      {/* Where to send the money — the block for the selected method's type. */}
      {selectedMethod && hasDestination(selectedMethod) && (
        <section className="card-glass p-6">
          <ReceivingDetails
            method={selectedMethod}
            styles={RECEIVING_STYLES}
            note="Transfer the amount to this account, then upload your payment proof below."
          />
        </section>
      )}

      {/* Manual payment: the player pays from their own app, then proves it.
          Nothing is credited here — an admin reviews the screenshot first. */}
      {needsProof && (
        <section className="card-glass p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payment proof</h2>
          <p className="mt-1 text-xs text-slate-500">
            Pay using {selectedMethod.name}, then upload a screenshot of the completed
            payment. Our team verifies it and credits your wallet.
          </p>

          <label className="mt-4 block text-sm text-slate-400">
            UTR / Reference number <span className="text-slate-600">(optional)</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              if (submitError) setSubmitError('');
            }}
            placeholder="e.g. 412345678901"
            className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
          />
          {submitError && <p className="mt-2 text-sm font-medium text-red-400">{submitError}</p>}

          <label className="mt-4 block text-sm text-slate-400">Screenshot</label>
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
              className="mt-2 flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center transition hover:border-brand-500/50 hover:bg-brand-500/5"
            >
              <Upload className="h-6 w-6 text-brand-400" />
              <span className="text-sm font-medium text-white">
                Tap to upload your payment screenshot
              </span>
              <span className="text-xs text-slate-500">PNG, JPG or WEBP · up to 5MB</span>
            </button>
          ) : (
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofPreview}
                  alt="Payment screenshot preview"
                  className="h-24 w-24 shrink-0 rounded-md border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{proofFile?.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {((proofFile?.size ?? 0) / 1024).toFixed(0)} KB
                  </p>
                  {uploading && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                    </p>
                  )}
                  {proofUrl && !uploading && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-green-400">
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
          {proofError && <p className="mt-2 text-xs font-semibold text-red-400">{proofError}</p>}
        </section>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-50"
      >
        {loading ? 'Processing…' : uploading ? 'Uploading screenshot…' : 'Submit deposit request'}
      </button>
      {needsProof && !proofUrl && !uploading && (
        <p className="text-center text-xs text-slate-500">
          Upload your payment screenshot to submit.
        </p>
      )}

      {result && (
        <section className="card-glass p-8 text-center">
          <Clock className="mx-auto h-14 w-14 text-brand-400" />
          <h2 className="mt-4 text-xl font-bold">Deposit submitted</h2>
          <p className="mt-1 text-sm text-slate-400">
            Pending approval. Your wallet will be credited once our team verifies the payment.
          </p>
          <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
            <Row label="Transaction ID" value={`#${result.transactionId}`} last />
          </div>
        </section>
      )}
    </div>
  );
}
