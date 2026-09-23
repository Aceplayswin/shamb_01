'use client';

// Theme5 Deposit — two independent ways to fund the wallet, picked with a tab:
//
//   • "Quick Pay" — dollara's original cashier flow: choose amount → choose
//     method → pay through the shared <PaymentGateway/> sandbox sheet → request
//     submitted for review. Unchanged; kept as-is per product decision (do not
//     remove PaymentGateway even once manual transfer is available).
//   • "Bank / UPI Transfer" — the admin-configured methods from Cashier →
//     Payment Methods (useDepositMethods), the "send payment to" block for the
//     chosen method's type (<ReceivingDetails/>: QR/UPI, bank account, crypto
//     address …), and a payment-screenshot upload the admin verifies before
//     crediting. Ported from mahakalworld's theme5, which has already moved to
//     this flow — see the local `uploadPaymentProof` note below for the one
//     adaptation this required.
//
// Neither flow credits the wallet on the player's action — every deposit stays
// pending until the product admin approves it from the admin panel.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Smartphone, Landmark, Bitcoin, Upload, X, Check, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { API_URL } from '@/services/tenant';
import { useAuthStore } from '@/store/auth';
import { PaymentGateway } from '@/components/payments/PaymentGateway';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, hasDestination, methodDescription } from '@/lib/paymentDestination';
import { T5Card, t5Input, t5BtnPrimary, t5BtnOutline, T5FormPage } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm', icon: Smartphone, eta: 'Instant' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer', icon: Landmark, eta: 'Instant' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification', icon: Landmark, eta: '5-30 min' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT', icon: Bitcoin, eta: '10-30 min' },
];

const STEPS = ['Amount', 'Method', 'Payment'];

const MANUAL_QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// dollara's shared services/api.js does not (yet) export the multipart
// `upload()` helper mahakalworld's does — kept local to this page, scoped to
// the one field the manual-transfer flow needs, rather than reaching into the
// shared services file from a single-theme change. Mirrors that helper
// exactly: no Content-Type header, so the browser sets the multipart boundary.
async function uploadPaymentProof(file) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/v1/wallet/deposit/proof`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? err.message ?? 'Upload failed');
  }
  return res.json();
}

// Theme5 (light / blue) palette for the shared "send payment to" block; the
// card itself is a T5Card wrapped around it.
const RECEIVING_STYLES = {
  card: '',
  title: 'font-black text-[#0f1b33]',
  note: 'mt-1 text-xs text-[#94a3b8]',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-4 py-3',
  label: 'text-[0.65rem] font-black uppercase tracking-wide text-[#94a3b8]',
  value: 'break-all font-bold text-[#0f1b33]',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-md border border-black/10 px-3 py-1.5 text-xs font-bold text-[#1d4ed8] transition hover:border-[#1d4ed8] hover:bg-[#eff4ff]',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-black/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded-lg bg-[#eff4ff] p-3 text-xs text-[#0f1b33]',
};

export default function Theme5Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();

  // Which of the two independent deposit flows is showing. Both post to the
  // same /wallet/deposit endpoint; only how the player gets there differs.
  const [mode, setMode] = useState('quick'); // 'quick' | 'manual'

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

  // --- Manual (bank / UPI transfer) flow state --------------------------------
  const [manualAmount, setManualAmount] = useState('');
  const [manualMethod, setManualMethod] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState(null);
  // UTR / reference the player copies out of their payment app.
  const [manualReference, setManualReference] = useState('');
  const [manualSubmitError, setManualSubmitError] = useState('');
  // Payment screenshot: the local File, its object-URL preview, the uploaded
  // URL once stored, and any validation/upload error.
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofError, setProofError] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const fileInputRef = useRef(null);
  // Methods the admin has configured, each carrying the account the player
  // pays into. No static fallback: an empty list is shown as unavailable.
  const {
    methods: manualMethods,
    loading: manualMethodsLoading,
    error: manualMethodsError,
  } = useDepositMethods(isHydrated && Boolean(token));

  const manualNumAmount = parseFloat(manualAmount) || 0;
  const manualBonus = manualNumAmount >= 1000 ? manualNumAmount * 0.5 : 0;
  const selectedManualMethod = manualMethods.find((pm) => pm.code === manualMethod) ?? null;
  // Every admin-configured method is paid manually, so proof is always asked
  // for once a method is chosen.
  const needsProof = Boolean(selectedManualMethod);
  const manualLimit = amountWithinLimits(selectedManualMethod, manualNumAmount);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  const stepIndex = { amount: 0, method: 1, pay: 2, done: 2 }[step];

  // A method the admin has since disabled must not stay selected.
  useEffect(() => {
    if (manualMethod && !manualMethods.some((pm) => pm.code === manualMethod)) setManualMethod('');
  }, [manualMethods, manualMethod]);

  // A reference or screenshot belongs to one payment: changing the method
  // means that payment was never made, so the proof starts over.
  useEffect(() => {
    setManualReference('');
    setManualSubmitError('');
    setProofFile(null);
    setProofPreview('');
    setProofUrl('');
    setProofError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [manualMethod]);

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
    setProofUploading(true);
    try {
      const res = await uploadPaymentProof(file);
      setProofUrl(res.url);
    } catch (e) {
      setProofError(e instanceof Error ? e.message : 'Upload failed');
      setProofFile(null);
      setProofPreview('');
    } finally {
      setProofUploading(false);
    }
  };

  const clearProof = () => {
    setProofFile(null);
    setProofPreview('');
    setProofUrl('');
    setProofError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitManual = async () => {
    if (!selectedManualMethod) return;
    setManualLoading(true);
    setManualSubmitError('');
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: manualNumAmount,
          paymentMethod: selectedManualMethod.code,
          referenceNumber: manualReference.trim() || null,
          paymentProofUrl: proofUrl || null,
        }),
      });
      setManualResult(res);
      // Clear the form: the request is queued and the same screenshot must not
      // be submitted again by accident.
      setManualAmount('');
      setManualReference('');
      clearProof();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      setManualSubmitError(msg);
    } finally {
      setManualLoading(false);
    }
  };

  const canSubmitManual =
    !manualLoading &&
    !proofUploading &&
    manualNumAmount > 0 &&
    Boolean(selectedManualMethod) &&
    manualLimit.ok &&
    (!needsProof || Boolean(proofUrl));

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
    <T5FormPage title="Deposit">
      {step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {error && (
        <p className="mt-4 rounded-lg border border-[#f4547a]/30 bg-[#f4547a]/10 px-3 py-2 text-sm text-[#c23a5e]">
          {error}
        </p>
      )}

      {/* ── Step 1: Amount ── */}
      {step === 'amount' && (
        <div className="mt-6 space-y-6">
          <T5Card className="p-6">
            <label className="text-sm text-[#64748b]">Enter Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={`${t5Input} mt-2 text-2xl`}
              autoFocus
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#0f1b33] shadow-sm transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                >
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            {numAmount > 0 && (
              <div className="mt-4 rounded-lg border border-[#22a34a]/25 bg-[#22a34a]/10 p-4 text-sm text-[#15803d]">
                <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
                {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
                <p className="font-black">Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-[#94a3b8]">Minimum deposit ₹{MIN_DEPOSIT}.</p>
          </T5Card>

          <button
            type="button"
            onClick={() => valid && setStep('method')}
            disabled={!valid}
            className={`${t5BtnPrimary} w-full`}
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Method ── */}
      {step === 'method' && (
        <div className="mt-6 space-y-6">
          <T5Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748b]">Depositing</span>
              <span className="text-lg font-black text-[#1d4ed8]">₹{numAmount.toLocaleString('en-IN')}</span>
            </div>
            <h2 className="mt-5 text-sm font-black uppercase tracking-wide text-[#64748b]">
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
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition ${
                      active ? 'border-[#1d4ed8] bg-[#eff4ff]' : 'border-black/10 bg-white hover:bg-[#f8fafc]'
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eff4ff] text-[#1d4ed8]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[#0f1b33]">{pm.label}</span>
                      <span className="block text-xs text-[#94a3b8]">{pm.desc}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[#94a3b8]">{pm.eta}</span>
                  </button>
                );
              })}
            </div>
          </T5Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('amount')} className={`${t5BtnOutline} flex-1`}>
              Back
            </button>
            <button
              type="button"
              onClick={startPayment}
              disabled={creating}
              className={`${t5BtnPrimary} flex-[2]`}
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
          <T5Card className="p-8 text-center">
            <Clock className="mx-auto h-14 w-14 text-[#1d4ed8]" />
            <h2 className="mt-4 text-xl font-black text-[#0f1b33]">Deposit submitted</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              ₹{Number(receipt.amount).toLocaleString('en-IN')} is awaiting confirmation. Your wallet will
              be credited once our team approves the payment.
            </p>
            <div className="mt-6 space-y-2 rounded-lg border border-black/[0.06] bg-[#f8fafc] p-4 text-left text-sm">
              <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} />
              <Row label="Reference" value={receipt.reference} />
              <Row label="Transaction ID" value={`#${transactionId}`} />
              <Row label="Status" value="Pending approval" last />
            </div>
          </T5Card>
          <div className="flex gap-3">
            <button type="button" onClick={reset} className={`${t5BtnOutline} flex-1`}>
              New deposit
            </button>
            <Link href="/wallet" className={`${t5BtnPrimary} flex-1 text-center`}>
              Go to wallet
            </Link>
          </div>
        </div>
      )}
    </T5FormPage>
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
                    ? 'bg-[#22a34a] text-white'
                    : active
                      ? 'bg-[#1d4ed8] text-white'
                      : 'bg-[#eef1f4] text-[#94a3b8]'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1.5 text-[0.7rem] ${active ? 'font-bold text-[#0f1b33]' : 'text-[#94a3b8]'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${i < current ? 'bg-[#22a34a]/60' : 'bg-black/10'}`} />
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
      <span className="text-[#94a3b8]">{label}</span>
      <span className="font-bold text-[#0f1b33]">{value}</span>
    </div>
  );
}
