'use client';

// Manual Payment on the deposit page: the player pays into one of the
// admin's receiving accounts (Backoffice → Payment Methods), then submits the
// UTR and a payment screenshot. The deposit is queued PENDING; an admin checks
// the UTR / screenshot and approves it before the wallet is credited.
//
// All state and API calls live here so each theme only renders.

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, upload } from '@/services/api';
import { affiliateAttribution } from '@/lib/referral';
import { amountWithinLimits } from '@/lib/paymentDestination';
import { useDepositMethods } from '@/hooks/useDepositMethods';

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// Same rule as the API: letters and digits, 6–100 of them, spaces ignored.
const UTR_RE = /^[A-Za-z0-9]{6,100}$/;

export function normalizeUtr(value) {
  return String(value || '').replace(/\s+/g, '');
}

export function useManualDeposit(enabled = true) {
  const { methods, loading: methodsLoading, error: methodsError } = useDepositMethods(enabled);
  const [methodCode, setMethodCode] = useState('');
  const [reference, setReference] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofError, setProofError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const fileInputRef = useRef(null);
  // Bumped on every pick/clear so a slow upload cannot land after the player
  // removed or replaced the screenshot.
  const uploadSeq = useRef(0);

  const selectedMethod = methods.find((m) => m.code === methodCode) ?? null;

  // Preselect the first account; drop one the admin has since disabled.
  useEffect(() => {
    if (!methods.length) {
      setMethodCode('');
      return;
    }
    if (!methods.some((m) => m.code === methodCode)) setMethodCode(methods[0].code);
  }, [methods, methodCode]);

  const clearProof = useCallback(() => {
    uploadSeq.current += 1;
    setProofFile(null);
    setProofPreview('');
    setProofUrl('');
    setProofError('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // A UTR / screenshot belongs to one payment into one account.
  useEffect(() => {
    setReference('');
    clearProof();
  }, [methodCode, clearProof]);

  // Object URLs leak until revoked.
  useEffect(() => {
    if (!proofPreview) return undefined;
    return () => URL.revokeObjectURL(proofPreview);
  }, [proofPreview]);

  // Picking a file uploads it straight away, so it is stored (and validated
  // by the server) before the deposit is submitted.
  const pickProof = useCallback(async (file) => {
    if (!file) return;
    const seq = ++uploadSeq.current;
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
      if (seq === uploadSeq.current) setProofUrl(res.url);
    } catch (e) {
      if (seq !== uploadSeq.current) return;
      setProofError(e instanceof Error ? e.message : 'Upload failed');
      setProofFile(null);
      setProofPreview('');
    } finally {
      if (seq === uploadSeq.current) setUploading(false);
    }
  }, []);

  const utr = normalizeUtr(reference);
  const utrValid = UTR_RE.test(utr);

  // Why the submit button is disabled, or null when the form is complete.
  const blocker = (amount) => {
    if (!selectedMethod) return 'Choose the account you paid into.';
    const limit = amountWithinLimits(selectedMethod, amount);
    if (!limit.ok) return limit.message;
    if (!utrValid) return 'Enter the UTR / transaction reference.';
    if (uploading) return 'Uploading screenshot…';
    if (!proofUrl) return 'Upload your payment screenshot.';
    return null;
  };

  const submit = useCallback(
    async ({ amount }) => {
      if (!selectedMethod) return null;
      setError(null);
      setSubmitting(true);
      try {
        const res = await api('/api/v1/wallet/deposit/manual', {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(amount),
            paymentMethod: selectedMethod.code,
            referenceNumber: utr,
            paymentProofUrl: proofUrl,
            ...affiliateAttribution(),
          }),
        });
        setReceipt(res);
        return res;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not submit the deposit');
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [selectedMethod, utr, proofUrl],
  );

  const reset = useCallback(() => {
    setReference('');
    clearProof();
    setError(null);
    setReceipt(null);
  }, [clearProof]);

  return {
    methods,
    methodsLoading,
    methodsError,
    methodCode,
    setMethodCode,
    selectedMethod,
    reference,
    setReference,
    utrValid,
    proofFile,
    proofPreview,
    proofUrl,
    proofError,
    uploading,
    fileInputRef,
    pickProof,
    clearProof,
    submitting,
    error,
    setError,
    receipt,
    blocker,
    submit,
    reset,
  };
}

export default useManualDeposit;
