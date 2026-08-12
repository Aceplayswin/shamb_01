'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, DollarSign, ArrowLeft, CheckCircle2, Eye, EyeOff, Send, ShieldCheck, ArrowRight, Users } from 'lucide-react';
import { fetchProgram, submitApplication } from '../../services/affiliateApi';

// Blank slate for the form — kept outside the component so we're not
// recreating this object on every render

const initialForm = {
  fullName: '',
  email: '',
  // The applicant sets their own password here — approval turns the record into
  // a login, and a staff-generated password would have to be transmitted
  // somehow, which is worse.
  password: '',
  confirmPassword: '',
  phone: '',
  companyName: '',
  trafficSource: 'SEO',
  expectedVolume: '10-50',
  paymentPreference: 'Bank',
  notes: '',
};



export default function ApplyPage() {
  return (
    <Suspense fallback={null}>
      <ApplyForm />
    </Suspense>
  );
}

function ApplyForm() {

  // Which step of the wizard we're on (1 = account, 2 = personal, 3 = payment)

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // A sub-affiliate invite carries these. The previous build generated invite
  // URLs with exactly these parameters and then never read them here, so every
  // invite silently produced an unlinked, direct application.
  const searchParams = useSearchParams();
  const parentCode = searchParams.get('parent_affiliate_code');
  const overrideRate = searchParams.get('override_rate');

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const goNext = () => {
    // Step 1 holds the credentials, so it is the only step that blocks.
    if (step === 1) {
      if (!formData.fullName.trim() || !formData.email.trim()) {
        setError('Your name and email address are both required.');
        return;
      }
      if (!formData.email.includes('@')) {
        setError('Enter a valid email address.');
        return;
      }
      if (formData.password.length < 8) {
        setError('Choose a password of at least 8 characters.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('The two passwords do not match.');
        return;
      }
    }
    setError('');
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const response = await submitApplication({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        companyName: formData.companyName.trim() || undefined,
        trafficSource: formData.trafficSource,
        expectedVolume: formData.expectedVolume,
        paymentPreference: formData.paymentPreference,
        notes: formData.notes.trim() || undefined,
        // Carried through from the invite link, so the recruiting partner is
        // actually credited as the parent.
        parentAffiliateCode: parentCode || undefined,
        overrideRate: overrideRate || undefined,
      });
      setResult(response);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'We could not submit your application. Please try again.');
      setSubmitting(false);
    }
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
                have your application against <span className="text-brand-600 font-medium">{formData.email}</span>.
                You can sign in with that address once a reviewer approves it.
              </p>

              {result?.code && (
                <p className="mt-4 text-xs text-slate-500">
                  Your partner code will be{' '}
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono font-semibold text-slate-800">
                    {result.code}
                  </span>
                </p>
              )}


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
                {result?.parentName && (
                  <div className="flex justify-between">
                    <span>Referred By:</span>
                    <span className="text-slate-900 font-medium">{result.parentName}</span>
                  </div>
                )}
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


          {parentCode && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-slate-700">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>
                You were invited by partner{' '}
                <span className="font-semibold text-slate-900">{parentCode}</span>
                {overrideRate ? ` at a ${overrideRate}% network rate` : ''}. Your
                application will be linked to them.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-4 py-3 text-sm text-danger-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {step === 1 && (
              <StepAccountDetails
                formData={formData}
                updateField={updateField}
                onNext={goNext}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
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
              <StepPaymentMethod
                formData={formData}
                updateField={updateField}
                onBack={goBack}
                submitting={submitting}
              />
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


function StepAccountDetails({ formData, updateField, onNext, showPassword, setShowPassword }) {
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
        <p className="mt-1.5 text-xs text-slate-400">
          This becomes your sign-in address once the application is approved.
        </p>
      </div>

      <div>
        <label className={labelClasses}>Phone Number</label>
        <input
          type="tel"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className={labelClasses}>Password *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={inputClasses}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-slate-400 transition-colors hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Confirm Password *</label>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            className={inputClasses}
          />
        </div>
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



function StepPaymentMethod({ formData, updateField, onBack, submitting }) {
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
          disabled={submitting}
          className="flex-1 py-4 text-base font-bold text-black bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 hover:from-brand-300 hover:to-brand-500 rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:hover:scale-100"
        >
          <Send className="w-5 h-5" />
          <span>{submitting ? 'Submitting…' : 'Submit Application'}</span>
        </button>
                                 </div>
    </div>
  );
}