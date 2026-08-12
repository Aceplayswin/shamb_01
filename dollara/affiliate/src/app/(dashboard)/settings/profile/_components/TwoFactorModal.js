'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { AlertCircle, Check, Copy, Loader2, ShieldCheck, X } from 'lucide-react';
import { affiliateApi } from '../../../../../services/affiliateApi';
import { toast } from '../../../../../lib/toast';

/**
 * Two-factor enrolment and removal.
 *
 * Enabling is deliberately two steps: the server issues a secret, and the flag
 * only flips once a code proves the authenticator actually holds it. Flipping
 * first — which is what the old local-state toggle effectively simulated —
 * would lock out anyone whose scan silently failed.
 *
 * Disabling asks for the password *and* a live code, because either one alone
 * would let whoever is holding the session strip the second factor.
 */
export default function TwoFactorModal({ mode, onClose, onChanged }) {
  const canvasRef = useRef(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(mode === 'enable');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode !== 'enable') return undefined;
    let active = true;

    affiliateApi('/api/v1/affiliate/profile/2fa/setup', { method: 'POST' })
      .then((res) => {
        if (!active) return;
        setSecret(res.secret);
        // Rendered client-side so the secret never travels through an image
        // endpoint or lands in a proxy log.
        if (canvasRef.current) {
          QRCode.toCanvas(canvasRef.current, res.otpauth_uri, {
            width: 200,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' },
          });
        }
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [mode]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      if (mode === 'enable') {
        await affiliateApi('/api/v1/affiliate/profile/2fa/enable', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        toast.success('Two-factor authentication enabled');
      } else {
        await affiliateApi('/api/v1/affiliate/profile/2fa/disable', {
          method: 'POST',
          body: JSON.stringify({ password, code }),
        });
        toast.success('Two-factor authentication disabled');
      }
      onChanged();
    } catch (err) {
      setError(err.message || 'That did not work. Please try again.');
      setBusy(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-up dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-black text-slate-900 dark:text-slate-100">
                {mode === 'enable' ? 'Enable two-factor' : 'Disable two-factor'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'enable'
                  ? 'Scan the code with your authenticator app.'
                  : 'Confirm it is really you.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'enable' && (
            <>
              <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700">
                {loading ? (
                  <div className="flex h-[200px] w-[200px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <canvas ref={canvasRef} aria-label="Two-factor setup QR code" />
                )}
              </div>

              {secret && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Or enter this key manually
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"
                      aria-label="Copy secret"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'disable' && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`mt-2 ${inputCls}`}
                autoComplete="current-password"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              6-digit code
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="000000"
              className={`mt-2 text-center font-mono text-lg tracking-[0.4em] ${inputCls}`}
              autoComplete="one-time-code"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || loading || code.length !== 6}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
              mode === 'enable'
                ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-black'
                : 'bg-rose-500 text-white hover:bg-rose-600'
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'enable' ? 'Verify and enable' : 'Disable two-factor'}
          </button>
        </form>
      </div>
    </div>
  );
}
