'use client';

// Theme5 Deposit — same data flow as theme2/3/4 (shared wallet endpoints), light
// portal style. The methods come from the admin console (Cashier → Payment
// Methods) and the block under the chosen one is decided by its TYPE — UPI: QR
// code + UPI ID, bank: the receiving account, crypto: network + wallet address.
// Every method is paid out of band from the player's own app, so a screenshot
// is the evidence an admin checks before crediting.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import { api, upload } from '@/services/api';
import { affiliateAttribution } from '@/lib/referral';
import { useAuthStore } from '@/store/auth';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, hasDestination, methodDescription } from '@/lib/paymentDestination';
import { T5Card, t5Input, t5BtnPrimary, T5FormPage } from '../components/ui';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  // One request at a time, same as withdrawals: the form stays locked until
  // the open deposit is approved or rejected.
  const [hasPending, setHasPending] = useState(false);
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
  const {
    methods,
    loading: methodsLoading,
    error: methodsError,
  } = useDepositMethods(isHydrated && Boolean(token));

  const numAmount = parseFloat(amount) || 0;
  const selectedMethod = methods.find((pm) => pm.code === method) ?? null;
  // Every admin-configured method is paid manually, so proof is always asked
  // for once a method is chosen.
  const needsProof = Boolean(selectedMethod);
  const limit = amountWithinLimits(selectedMethod, numAmount);

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
    if (token) loadPending();
  }, [token]);

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
    if (!selectedMethod || hasPending) return;
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
          ...affiliateAttribution(),
        }),
      });
      setResult(res);
      setHasPending(true);
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
      loadPending();
    }
  };

  const canSubmit =
    !loading &&
    !uploading &&
    !hasPending &&
    numAmount > 0 &&
    Boolean(selectedMethod) &&
    limit.ok &&
    (!needsProof || Boolean(proofUrl));

  return (
    <T5FormPage
      title="Deposit"
      tabs={[
        { label: 'Deposit', href: '/deposit', active: true },
        { label: 'Withdrawals', href: '/withdraw' },
      ]}
    >
      {hasPending ? (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
          You have a deposit request awaiting approval. You can place a new
          request once it has been approved or rejected.
        </p>
      ) : null}
      <T5Card className="mt-4 p-6">
        <label className="text-sm text-[#64748b]">Enter Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={`${t5Input} mt-2 text-2xl`}
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
      </T5Card>

      <T5Card className="mt-4 p-6">
        <h2 className="font-black text-[#0f1b33]">Payment Method</h2>
        {methodsLoading ? (
          <p className="mt-4 text-sm text-[#94a3b8]">Loading payment methods…</p>
        ) : methods.length === 0 ? (
          <p className="mt-4 rounded-lg border border-black/10 bg-white p-4 text-sm text-[#64748b]">
            {methodsError
              ? 'Payment methods are temporarily unavailable. Please try again shortly.'
              : 'No payment methods are available right now. Please contact support.'}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {methods.map((pm) => (
              <label
                key={pm.code}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                  method === pm.code ? 'border-[#1d4ed8] bg-[#eff4ff]' : 'border-black/10 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={pm.code}
                  checked={method === pm.code}
                  onChange={() => setMethod(pm.code)}
                  className="accent-[#1d4ed8]"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[#0f1b33]">{pm.name}</p>
                  <p className="text-xs text-[#94a3b8]">{methodDescription(pm)}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        {selectedMethod && numAmount > 0 && !limit.ok && (
          <p className="mt-3 text-sm font-bold text-[#b45309]">{limit.message}</p>
        )}
      </T5Card>

      {/* Where to send the money — the block for the selected method's type. */}
      {selectedMethod && hasDestination(selectedMethod) && (
        <T5Card className="mt-4 p-6">
          <ReceivingDetails
            method={selectedMethod}
            styles={RECEIVING_STYLES}
            note="Transfer the amount to this account, then upload your payment proof below."
          />
        </T5Card>
      )}

      {/* Manual payment: the player pays from their own app, then proves it.
          Nothing is credited here — an admin reviews the screenshot first. */}
      {needsProof && (
        <T5Card className="mt-4 p-6">
          <h2 className="font-black text-[#0f1b33]">Payment proof</h2>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Pay using {selectedMethod.name}, then upload a screenshot of the
            completed payment. Our team verifies it and credits your wallet.
          </p>

          <label className="mt-4 block text-sm text-[#64748b]">
            UTR / Reference number <span className="text-[#94a3b8]">(optional)</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              if (submitError) setSubmitError('');
            }}
            placeholder="e.g. 412345678901"
            className={`${t5Input} mt-2`}
            aria-invalid={Boolean(submitError)}
          />
          {submitError ? (
            <p className="mt-2 text-sm font-medium text-red-600">{submitError}</p>
          ) : null}

          <label className="mt-4 block text-sm text-[#64748b]">Screenshot</label>
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
              className="mt-2 flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-black/15 bg-white px-4 py-8 text-center transition hover:border-[#1d4ed8] hover:bg-[#eff4ff]"
            >
              <Upload className="h-6 w-6 text-[#1d4ed8]" />
              <span className="text-sm font-bold text-[#0f1b33]">
                Tap to upload your payment screenshot
              </span>
              <span className="text-xs text-[#94a3b8]">PNG, JPG or WEBP · up to 5MB</span>
            </button>
          ) : (
            <div className="mt-2 rounded-lg border border-black/10 bg-white p-3">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofPreview}
                  alt="Payment screenshot preview"
                  className="h-24 w-24 shrink-0 rounded-md border border-black/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#0f1b33]">
                    {proofFile?.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#94a3b8]">
                    {((proofFile?.size ?? 0) / 1024).toFixed(0)} KB
                  </p>
                  {uploading && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#1d4ed8]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                    </p>
                  )}
                  {proofUrl && !uploading && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#15803d]">
                      <Check className="h-3.5 w-3.5" /> Uploaded
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearProof}
                  aria-label="Remove screenshot"
                  className="rounded-md p-1 text-[#94a3b8] transition hover:bg-black/5 hover:text-[#0f1b33]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {proofError && (
            <p className="mt-2 text-xs font-bold text-[#f4547a]">{proofError}</p>
          )}
        </T5Card>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className={`${t5BtnPrimary} mt-4 w-full`}
      >
        {hasPending
          ? 'Deposit Pending Approval'
          : loading
            ? 'Processing...'
            : uploading
              ? 'Uploading screenshot…'
              : 'Submit deposit request'}
      </button>
      {needsProof && !proofUrl && !uploading && (
        <p className="mt-2 text-center text-xs text-[#94a3b8]">
          Upload your payment screenshot to submit.
        </p>
      )}
      {result && (
        <div className="mt-4 rounded-lg border border-[#1d4ed8]/25 bg-[#eff4ff] p-4 text-center">
          <p className="text-sm font-black text-[#1d4ed8]">Deposit submitted — pending approval</p>
          <p className="mt-1 text-xs text-[#64748b]">
            Request ID: {result.transactionId}. Our team is reviewing your payment
            proof — your wallet is credited once it is approved.
          </p>
        </div>
      )}
    </T5FormPage>
  );
}
