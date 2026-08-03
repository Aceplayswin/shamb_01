'use client';

import { useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { DollarSign, ArrowLeft, CheckCircle2, Send, ShieldCheck, ArrowRight } from 'lucide-react';

// Blank slate for the form — kept outside the component so we're not
// recreating this object on every render

const initialForm = {
  fullName: '',
  email: '',
  companyName: '',
  trafficSource: 'SEO',
  expectedVolume: '10-50',
  paymentPreference: 'Bank',
  notes: '',
};



export default function ApplyPage() {

  // Which step of the wizard we're on (1 = account, 2 = personal, 3 = payment)

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialForm);

  // Flips to true once the user hits submit, swaps the whole form out for the
  // "thanks, pending approval" screen

  const [submitted, setSubmitted] = useState(false);

  // Generic field updater so we don't have to write a new onChange handler
  // for every single input


  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {


    // Step 1 is the only step with required fields, so that's the only
    // place we block navigation. Steps 2/3 are fine to skip through.


    if (step === 1 && (!formData.fullName || !formData.email)) {
      alert('Please fill out all required fields.');
      return;
    }
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  const onSubmit = (e) => {
    e.preventDefault();

    // NOTE: this isn't hitting an API right now — it's just a UI-only
    // success state. Wire this up to the real endpoint when the backend
    // route is ready.


    Swal.fire({
      icon: 'success',
      title: 'Application Submitted!',
      text: 'Your application has been received and is currently Pending Approval. Our team will review it within 24 hours.',
      background: '#FFFFFF',
      color: '#0F172A',
      confirmButtonColor: '#E2B13C',
      customClass: {
        popup: 'border border-slate-200 rounded-2xl shadow-xl bg-white',
      },
    });

    setSubmitted(true);
  };

  // ── Success screen ──
  // Once submitted, we don't show the form again — just a summary of what
  // they applied with, plus a couple of exit links.


  if (submitted) {
    return (
      <div className="min-h-screen text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-2xl mx-auto relative z-10">
          <PageHeader />

          <div className="glass p-8 sm:p-10 relative bg-white/80 border-slate-200 shadow-xl">
            <div className="text-center py-8 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-emerald-55 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold font-display text-slate-900">
                Application Pending Approval
              </h2>

              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                Thank you for applying, <span className="text-slate-900 font-semibold">{formData.fullName}</span>! We
                sent a confirmation receipt to <span className="text-brand-600 font-medium">{formData.email}</span>.
                                        </p>


              {/* Quick recap of what they submitted — mostly reassurance, not meant to be exhaustive */}


              <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
                <div className="flex justify-between">
                  <span>Application Status:</span>
                  <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-800 font-bold uppercase">
                    Pending
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target Traffic:</span>
                  <span className="text-slate-900 font-medium">
                    {formData.trafficSource} ({formData.expectedVolume} FTDs/mo)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payout Method:</span>
                  <span className="text-slate-900 font-medium">{formData.paymentPreference}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
                >
                  Return to Home
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-brand-400 to-brand-500 hover:scale-[1.02] shadow-md transition-all"
                >
                  Go to Login Screen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form screen ──
  return (
    <div className="min-h-screen text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-2xl mx-auto relative z-10">
        <PageHeader />

        <div className="glass p-8 sm:p-10 relative bg-white/80 border-slate-200 shadow-xl">
          <div className="mb-10">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold font-display text-slate-900">Apply Now</h1>
              <div className="w-16 h-1 bg-brand-500 mx-auto mt-2 rounded-full" />
            </div>

            <StepIndicator currentStep={step} />
          </div>


          {/* Only one step is ever rendered at a time — the form tag wraps
              all of them so Enter/submit still works no matter which step
              you're on */}


          <form onSubmit={onSubmit} className="space-y-6">
            {step === 1 && (
              <StepAccountDetails formData={formData} updateField={updateField} onNext={goNext} />
            )}

            {step === 2 && (
              <StepPersonalDetails
                formData={formData}
                updateField={updateField}
                onNext={goNext}
                onBack={goBack}
              />
            )}

            {step === 3 && (
              <StepPaymentMethod formData={formData} updateField={updateField} onBack={goBack} />
            )}
          </form>
        </div>
      </div>
    </div>
  );
}



// Top bar with the "back to landing" link and the logo — same on every
// screen (form + success), so it's pulled out here instead of copy-pasted
function PageHeader() {
  return (
    <div className="mb-8 flex items-center justify-between">
      <Link href="/" className="inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Landing Page</span>
      </Link>
      <div className="flex items-center space-x-2">
        <img src="/logo/image.png" alt="Dollara Logo" className="h-8 w-auto object-contain" />
        <span className="font-bold text-slate-900 font-display">DOLLARA</span>
      </div>
    </div>
  );
}



// The 1-2-3 progress dots at the top of the form. Just visual — doesn't
// control navigation, `currentStep` decides which circles light up.



function StepIndicator({ currentStep }) {
  const steps = [
    { number: 1, label: 'Account Details' },
    { number: 2, label: 'Personal Details' },
    { number: 3, label: 'Payment Methods' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto relative z-10 text-center text-xs font-semibold">
      {steps.map(({ number, label }) => {


        // "Active" here just means "reached or passed", not "currently on"


        const isActive = currentStep >= number;
        return (
          <div key={number} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs mb-1.5 transition-all ${
                isActive ? 'bg-brand-500 border-brand-500 text-black font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              {number}
            </div>
            <span className={isActive ? 'text-slate-900' : 'text-slate-400'}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Shared styles so every input/select looks the same without repeating the
// class list a dozen times


const inputClasses =
  'w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-colors shadow-sm';

const labelClasses = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2';

// Step 1 — just name + email, the bare minimum to create an account


function StepAccountDetails({ formData, updateField, onNext }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <label className={labelClasses}>Full Name *</label>
        <input
          type="text"
          required
          placeholder="e.g. Alex Morgan"
          value={formData.fullName}
          onChange={(e) => updateField('fullName', e.target.value)}
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Email Address *</label>
        <input
          type="email"
          required
          placeholder="alex@partner.com"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          className={inputClasses}
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full py-4 text-base font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center space-x-2"
      >
        <span>Next</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Step 2 — company info + how they plan to drive traffic. Nothing here is
// required, so `onNext` doesn't run any validation for this step.


function StepPersonalDetails({ formData, updateField, onNext, onBack }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <label className={labelClasses}>Company / Media Name</label>
        <input
          type="text"
          placeholder="e.g. Alpha Traffic Media"
          value={formData.companyName}
          onChange={(e) => updateField('companyName', e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className={labelClasses}>Primary Traffic Source *</label>
          <select
            value={formData.trafficSource}
            onChange={(e) => updateField('trafficSource', e.target.value)}
            className={inputClasses}
          >
            <option value="SEO">SEO / Website</option>
            <option value="Social">Social Media (Telegram, Youtube, X)</option>
            <option value="PPC">PPC / Paid Search</option>
            <option value="Email">Email Marketing</option>
            <option value="Streamer">Live Streaming / Influencer</option>
            <option value="Network">Sub-Affiliate Network</option>
          </select>
        </div>

        <div>
          <label className={labelClasses}>Expected Monthly Volume (FTDs) *</label>
          <select
            value={formData.expectedVolume}
            onChange={(e) => updateField('expectedVolume', e.target.value)}
            className={inputClasses}
          >
            <option value="1-10">1 - 10 FTDs / month</option>
            <option value="10-50">10 - 50 FTDs / month</option>
            <option value="50-200">50 - 200 FTDs / month</option>


            {/* Anything above 200/mo gets flagged as a VIP deal for sales to follow up on manually */}


            <option value="200+">200+ FTDs / month (VIP deal)</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClasses}>Additional Information / Website URLs</label>
        <textarea
          rows={3}
          placeholder="Provide your website link, channel URLs, or previous affiliate experience..."
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 text-base font-bold border border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm text-slate-700 transition-all"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-4 text-base font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center space-x-2"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 3 — final step, just picks a payout method and submits. This is the
// only button that's type="submit" — the other "Next" buttons are
// type="button" so they don't trigger the form's onSubmit early.



function StepPaymentMethod({ formData, updateField, onBack }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <label className={labelClasses}>Payment Preference *</label>
        <select
          value={formData.paymentPreference}
          onChange={(e) => updateField('paymentPreference', e.target.value)}
          className={inputClasses}
        >
          <option value="Bank">Bank Wire Transfer</option>
          <option value="UPI">UPI / Local Instant</option>
          <option value="Crypto">Crypto (USDT / BTC / ETH)</option>
        </select>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 text-base font-bold border border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm text-slate-700 transition-all"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-4 text-base font-bold text-black bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 hover:from-brand-300 hover:to-brand-500 rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center space-x-2"
        >
          <Send className="w-5 h-5" />
          <span>Submit Application</span>
        </button>
                                 </div>
    </div>
  );
}