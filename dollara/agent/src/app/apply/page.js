'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Send,
} from 'lucide-react';
import { PublicFooter, PublicHeader } from '../_components/PublicShell';
import { fetchProgram, submitApplication } from '../../services/agentApi';

// Blank slate, kept outside the component so it is not rebuilt every render.
const INITIAL_FORM = {
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  companyName: '',
  email: '',
  phone: '',
  marketRegion: '',
  expectedVolume: '10-50',
  experience: '1-3 years',
  parentCode: '',
  notes: '',
};

const STEPS = ['Login details', 'About you', 'Your operation'];

const VOLUME_OPTIONS = ['Under 10', '10-50', '50-200', '200-1000', '1000+'];
const EXPERIENCE_OPTIONS = ['New to this', 'Under 1 year', '1-3 years', '3-5 years', '5+ years'];

export default function ApplyPage() {
  // useSearchParams needs a Suspense boundary in the App Router, or the whole
  // route opts out of static rendering.
  return (
    <Suspense fallback={null}>
      <ApplyForm />
    </Suspense>
  );
}

function ApplyForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [reviewHours, setReviewHours] = useState(24);

  // An upline hands out /apply?ref=THEIRCODE. Prefilled rather than hidden so
  // the applicant can see — and correct — who they are being attributed to.
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setForm((current) => ({ ...current, parentCode: ref }));
  }, [searchParams]);

  useEffect(() => {
    fetchProgram()
      .then((p) => setReviewHours(p.reviewHours ?? 24))
      .catch(() => {});
  }, []);

  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError('');
  };

  const goNext = () => {
    // Step 1 holds the credentials, so it is the only step that blocks. The
    // server re-validates all of it — this is here to fail fast, not to be the
    // check that matters.
    if (step === 1) {
      if (!/^[A-Za-z0-9_.]{4,30}$/.test(form.username.trim())) {
        setError('Username must be 4-30 characters: letters, numbers, dot or underscore.');
        return;
      }
      if (form.password.length < 6) {
        setError('Choose a password of at least 6 characters.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('The two passwords do not match.');
        return;
      }
    }
    if (step === 2) {
      if (!form.name.trim()) {
        setError('Your name is required.');
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
        setError('Enter a valid email address.');
        return;
      }
    }
    setError('');
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await submitApplication({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        companyName: form.companyName.trim() || undefined,
        marketRegion: form.marketRegion.trim() || undefined,
        expectedVolume: form.expectedVolume,
        experience: form.experience,
        notes: form.notes.trim() || undefined,
        parentCode: form.parentCode.trim() || undefined,
      });
      setResult(response);
    } catch (err) {
      setError(err.message || 'We could not submit your application. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Success ──
  // The form is never shown again once submitted: re-submitting would only
  // produce a duplicate-username error, which reads like a failure.
  if (result) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-xl animate-fade-up">
            <div className="card p-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-up/15 text-up">
                <CheckCircle2 className="h-8 w-8" />
              </span>

              <h1 className="mt-5 text-2xl font-bold text-white">
                Application received
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Thanks, <span className="text-ink">{form.name}</span>. Your
                application is with{' '}
                {result.uplineName ? (
                  <span className="text-ink">{result.uplineName}</span>
                ) : (
                  'the operator'
                )}{' '}
                and is usually reviewed within {result.reviewHours ?? reviewHours}{' '}
                hours.
              </p>

              <dl className="mt-6 space-y-2 rounded bg-panel-sunken px-5 py-4 text-left text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Reference</dt>
                  <dd className="font-mono text-ink">{result.code}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Username</dt>
                  <dd className="text-ink">{result.username}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Status</dt>
                  <dd className="text-amber-300">Pending review</dd>
                </div>
              </dl>

              <p className="mt-5 text-xs text-ink-faint">
                You cannot sign in until the application is approved. Check back
                using the email address you applied with.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/apply/status" className="btn-primary">
                  Check status
                </Link>
                <Link href="/" className="btn-ghost">
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl animate-fade-up">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Apply for an agent account</h1>
            <p className="mt-3 text-sm text-ink-muted">
              Three short steps. You choose your own login here — approval turns
              it straight into a working account.
            </p>
          </div>

          {/* Step indicator */}
          <ol className="mt-9 flex items-center justify-center gap-2 sm:gap-4">
            {STEPS.map((title, index) => {
              const number = index + 1;
              const done = number < step;
              const current = number === step;
              return (
                <li key={title} className="flex items-center gap-2 sm:gap-4">
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                        current
                          ? 'bg-blue-600 text-white'
                          : done
                            ? 'bg-up/20 text-up'
                            : 'bg-panel-head text-ink-faint'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : number}
                    </span>
                    <span
                      className={`hidden text-sm sm:inline ${
                        current ? 'text-ink' : 'text-ink-faint'
                      }`}
                    >
                      {title}
                    </span>
                  </span>
                  {number < STEPS.length && (
                    <span className="h-px w-6 bg-hairline sm:w-10" />
                  )}
                </li>
              );
            })}
          </ol>

          <form onSubmit={onSubmit} className="card mt-8 p-6 sm:p-8">
            {error && (
              <div className="mb-6 flex items-start gap-2 rounded border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="apply-username" className="field-label">
                    Username
                  </label>
                  <input
                    id="apply-username"
                    autoComplete="username"
                    value={form.username}
                    onChange={set('username')}
                    className="field"
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">
                    This is how you will sign in. It cannot be changed later.
                  </p>
                </div>

                <div>
                  <label htmlFor="apply-password" className="field-label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="apply-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={set('password')}
                      className="field pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-3 text-ink-faint transition hover:text-ink"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="apply-confirm" className="field-label">
                    Confirm password
                  </label>
                  <input
                    id="apply-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    className="field"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="apply-name" className="field-label">
                    Full name
                  </label>
                  <input
                    id="apply-name"
                    value={form.name}
                    onChange={set('name')}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="apply-company" className="field-label">
                    Company <span className="text-ink-faint">(optional)</span>
                  </label>
                  <input
                    id="apply-company"
                    value={form.companyName}
                    onChange={set('companyName')}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="apply-email" className="field-label">
                    Email address
                  </label>
                  <input
                    id="apply-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={set('email')}
                    className="field"
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Used to check your application status.
                  </p>
                </div>
                <div>
                  <label htmlFor="apply-phone" className="field-label">
                    Phone <span className="text-ink-faint">(optional)</span>
                  </label>
                  <input
                    id="apply-phone"
                    value={form.phone}
                    onChange={set('phone')}
                    className="field"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="apply-region" className="field-label">
                      Market / region
                    </label>
                    <input
                      id="apply-region"
                      placeholder="e.g. Maharashtra"
                      value={form.marketRegion}
                      onChange={set('marketRegion')}
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="apply-volume" className="field-label">
                      Expected players
                    </label>
                    <select
                      id="apply-volume"
                      value={form.expectedVolume}
                      onChange={set('expectedVolume')}
                      className="field"
                    >
                      {VOLUME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="apply-experience" className="field-label">
                      Experience
                    </label>
                    <select
                      id="apply-experience"
                      value={form.experience}
                      onChange={set('experience')}
                      className="field"
                    >
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="apply-parent" className="field-label">
                      Upline code <span className="text-ink-faint">(optional)</span>
                    </label>
                    <input
                      id="apply-parent"
                      placeholder="e.g. MASTER01"
                      value={form.parentCode}
                      onChange={set('parentCode')}
                      className="field font-mono"
                    />
                    <p className="mt-1.5 text-xs text-ink-faint">
                      If an existing agent referred you, their code sends the
                      application straight to them. Leave blank to apply direct.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="apply-notes" className="field-label">
                    Anything else <span className="text-ink-faint">(optional)</span>
                  </label>
                  <textarea
                    id="apply-notes"
                    rows={4}
                    value={form.notes}
                    onChange={set('notes')}
                    className="field resize-y"
                  />
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              {step > 1 ? (
                <button type="button" onClick={goBack} className="btn-ghost">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <Link href="/" className="btn-ghost">
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </Link>
              )}

              {step < STEPS.length ? (
                <button type="button" onClick={goNext} className="btn-primary">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={submitting} className="btn-primary">
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting…' : 'Submit application'}
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-ink-faint">
            Already applied?{' '}
            <Link href="/apply/status" className="text-blue-400 hover:text-blue-300">
              Check your status
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
