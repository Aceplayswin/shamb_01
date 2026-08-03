'use client';

// Onboarding page — orchestrator only.
// All UI lives in ./_components/. This file only manages step state and form data.



import { useState } from 'react';
import Swal from 'sweetalert2';


import OnboardingShell   from './_components/OnboardingShell';

import StepTerms         from './_components/StepTerms';

import StepPayout        from './_components/StepPayout';

import StepKYC           from './_components/StepKYC';

import StepTrackingLink  from './_components/StepTrackingLink';



export default function OnboardingPage() {

  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);



  // Step 1

  const [agreedToTerms, setAgreedToTerms] = useState(false);



  // Step 2


  const [payoutMethod,  setPayoutMethod]  = useState('UPI');

  const [payoutDetails, setPayoutDetails] = useState({


    upiId: '', cryptoAddress: '',
    bankName: '', accountName: '', accountNumber: '', ifswift: '',


  });


  const updatePayoutDetail = (field, value) =>

    setPayoutDetails((prev) => ({ ...prev, [field]: value }));



  // Step 3

  const [docType, setDocType] = useState('Passport');
  const [docFile, setDocFile] = useState(null);


  const handleFinish = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Swal.fire({
        title: 'Welcome aboard! 🎉',
        text: "You're all set. Redirecting to your affiliate dashboard...",
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
        background: '#FFFFFF',
        color: '#0F172A',
      }).then(() => {
        window.location.href = '/dashboard';
      });
    }, 900);
  };



  return (
    <OnboardingShell currentStep={step}>

      {step === 1 && (
        <StepTerms
          agreed={agreedToTerms}
          setAgreed={setAgreedToTerms}
          onNext={() => setStep(2)}
        />
      )}



      {step === 2 && (
        <StepPayout
          method={payoutMethod}
          setMethod={setPayoutMethod}
          details={payoutDetails}
          updateDetail={updatePayoutDetail}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}



      {step === 3 && (
        <StepKYC
          docType={docType}
          setDocType={setDocType}
          docFile={docFile}
          setDocFile={setDocFile}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}



      {step === 4 && (
        <StepTrackingLink
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
