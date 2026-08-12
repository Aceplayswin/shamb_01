'use client';

// Onboarding page — orchestrator only.
// All UI lives in ./_components/. This file manages step state, and now also
// persists each step: terms, payout method and KYC document all previously
// lived in local state and were discarded when the page unmounted.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import {
  affiliateApi,
  affiliateUpload,
  getAffiliateToken,
} from '../../services/affiliateApi';
import { toast } from '../../lib/toast';

import OnboardingShell from './_components/OnboardingShell';
import StepTerms from './_components/StepTerms';
import StepPayout from './_components/StepPayout';
import StepKYC from './_components/StepKYC';
import StepTrackingLink from './_components/StepTrackingLink';

// The wizard's labels vs the API's enum values.
const METHOD_KEYS = { UPI: 'upi', Crypto: 'crypto', Bank: 'bank' };
const DOC_KEYS = {
  Passport: 'id_proof',
  'National ID': 'id_proof',
  "Driver's License": 'id_proof',
  'Utility Bill': 'address_proof',
  'Company Registration': 'company_registration',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [affiliate, setAffiliate] = useState(null);

  // Step 1
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 2
  const [payoutMethod, setPayoutMethod] = useState('UPI');
  const [payoutDetails, setPayoutDetails] = useState({
    upiId: '', cryptoAddress: '',
    bankName: '', accountName: '', accountNumber: '', ifswift: '',
  });

  const updatePayoutDetail = (field, value) =>
    setPayoutDetails((prev) => ({ ...prev, [field]: value }));

  // Step 3
  const [docType, setDocType] = useState('Passport');
  const [docFile, setDocFile] = useState(null);

  /**
   * This page sits outside the (dashboard) route group, so it carries its own
   * guard. It also resumes: an affiliate who closed the tab halfway through
   * lands on the first step they have not completed rather than starting over.
   */
  useEffect(() => {
    if (!getAffiliateToken()) {
      router.replace('/login');
      return;
    }

    Promise.all([
      affiliateApi('/api/v1/affiliate/onboarding'),
      affiliateApi('/api/v1/affiliate/me'),
    ])
      .then(([state, me]) => {
        setAffiliate(me);
        if (state.complete) {
          router.replace('/dashboard');
          return;
        }
        setAgreedToTerms(Boolean(state.steps.terms));
        if (!state.steps.terms) setStep(1);
        else if (!state.steps.payout) setStep(2);
        else if (!state.steps.kyc) setStep(3);
        else setStep(4);
        setReady(true);
      })
      .catch((err) => {
        toast.error(err.message);
        setReady(true);
      });
  }, [router]);

  const acceptTerms = async () => {
    setLoading(true);
    try {
      await affiliateApi('/api/v1/affiliate/onboarding/terms', { method: 'POST' });
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePayout = async () => {
    const methodType = METHOD_KEYS[payoutMethod] ?? 'upi';
    const details =
      methodType === 'upi'
        ? { upiId: payoutDetails.upiId }
        : methodType === 'crypto'
          ? { address: payoutDetails.cryptoAddress }
          : {
              bankName: payoutDetails.bankName,
              accountName: payoutDetails.accountName,
              accountNumber: payoutDetails.accountNumber,
              ifsc: payoutDetails.ifswift,
            };

    setLoading(true);
    try {
      await affiliateApi('/api/v1/affiliate/onboarding/payout', {
        method: 'POST',
        body: JSON.stringify({ methodType, details, label: payoutMethod }),
      });
      setStep(3);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async () => {
    // KYC is genuinely optional to reach the dashboard — verification takes
    // staff time and gating the console on it would leave a newly approved
    // partner waiting with nothing to do. Payouts still check it separately.
    if (!docFile) {
      setStep(4);
      return;
    }

    const body = new FormData();
    body.append('file', docFile);
    body.append('documentType', DOC_KEYS[docType] ?? 'id_proof');

    setLoading(true);
    try {
      await affiliateUpload('/api/v1/affiliate/onboarding/kyc', body);
      toast.success('Document uploaded for review');
      setStep(4);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await affiliateApi('/api/v1/affiliate/onboarding/complete', { method: 'POST' });
      toast.success('You are all set — welcome aboard');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA] dark:bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <OnboardingShell currentStep={step}>

      {step === 1 && (
        <StepTerms
          agreed={agreedToTerms}
          setAgreed={setAgreedToTerms}
          onNext={acceptTerms}
          loading={loading}
        />
      )}

      {step === 2 && (
        <StepPayout
          method={payoutMethod}
          setMethod={setPayoutMethod}
          details={payoutDetails}
          updateDetail={updatePayoutDetail}
          onNext={savePayout}
          onBack={() => setStep(1)}
          loading={loading}
        />
      )}

      {step === 3 && (
        <StepKYC
          docType={docType}
          setDocType={setDocType}
          docFile={docFile}
          setDocFile={setDocFile}
          onNext={uploadDocument}
          onBack={() => setStep(2)}
          loading={loading}
        />
      )}

      {step === 4 && (
        <StepTrackingLink
          affiliate={affiliate}
          payoutMethod={payoutMethod}
          docFile={docFile}
          onBack={() => setStep(3)}
          onFinish={handleFinish}
          loading={loading}
        />
      )}

    </OnboardingShell>
  );
}
