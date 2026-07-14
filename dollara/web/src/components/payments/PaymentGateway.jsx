'use client';

// ─────────────────────────────────────────────────────────────────────────────
//  PAYMENT GATEWAY — integration surface
//
//  This component is the ONE place the checkout UI lives. Today it runs in
//  "sandbox" mode: it renders a realistic, method-specific payment sheet and
//  simulates the provider round-trip, then calls `onConfirm(reference)` so the
//  wallet is credited through the normal confirm endpoint.
//
//  TO ATTACH A REAL GATEWAY (Razorpay / Stripe / Cashfree / …):
//    1. Server: create an order for `amount` and return an order id / token.
//    2. Here: in `pay()`, instead of the simulated delay, open the provider
//       checkout (e.g. `new Razorpay(options).open()`), passing that order id.
//    3. On the provider's success callback, call `onConfirm(providerPaymentId)`.
//    4. On failure/dismiss, surface the error (setError) and stay on the form.
//  The surrounding Deposit flow, the confirm endpoint, and the success screen do
//  not change — only the body of `pay()` below.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Landmark, CreditCard, Smartphone, Bitcoin, Lock, Loader2 } from 'lucide-react';

const SANDBOX = true; // flip to false once a real provider is wired into pay()

const METHOD_UI = {
  upi: { icon: Smartphone, label: 'UPI', payee: 'dollara@upi' },
  card: { icon: CreditCard, label: 'Card' },
  netbanking: { icon: Landmark, label: 'Net Banking' },
  imps: { icon: Landmark, label: 'Bank Transfer' },
  bank_transfer: { icon: Landmark, label: 'Bank Transfer' },
  crypto: { icon: Bitcoin, label: 'Crypto', address: '0x7A9f…c3Bd2 (USDT · TRC20)' },
};

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'];

function generateReference() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY${Date.now().toString().slice(-8)}${rand}`;
}

export function PaymentGateway({ amount, method = 'upi', onConfirm, onCancel }) {
  const ui = METHOD_UI[method] ?? METHOD_UI.upi;
  const Icon = ui.icon;

  const [phase, setPhase] = useState('form'); // 'form' | 'processing'
  const [error, setError] = useState(null);

  // Method-specific (sandbox) inputs — accepted as-is; a real gateway collects
  // these on its own hosted sheet.
  const [upiId, setUpiId] = useState('');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [bank, setBank] = useState(BANKS[0]);

  const pay = async () => {
    setError(null);
    setPhase('processing');
    const reference = generateReference();
    try {
      // Simulated provider round-trip. Replace with the real checkout open/await.
      await new Promise((r) => setTimeout(r, 1800));
      await onConfirm(reference);
      // On success the parent advances the step and unmounts this component.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed. Please try again.');
      setPhase('form');
    }
  };

  if (phase === 'processing') {
    return (
      <div className="card-glass p-8 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-400" />
        <p className="mt-4 text-lg font-semibold">Processing payment…</p>
        <p className="mt-1 text-sm text-slate-400">
          Securely confirming ₹{Number(amount).toLocaleString('en-IN')} via {ui.label}. Please don't
          close this window.
        </p>
        <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-glass overflow-hidden">
      {/* Gateway header — order summary + secure badge */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Pay with {ui.label}</p>
            <p className="text-xs text-slate-500">Amount ₹{Number(amount).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Lock className="h-3.5 w-3.5" /> Secure
        </span>
      </div>

      <div className="p-6">
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Method-specific sheet */}
        {method === 'upi' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-surface-700 p-4 text-center">
              <div className="mx-auto grid h-28 w-28 place-items-center rounded-lg bg-white/5 text-xs text-slate-500">
                QR code
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Scan with any UPI app, or pay to <span className="text-white">{ui.payee}</span>
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Or enter your UPI ID</label>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@bank"
                className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
              />
            </div>
          </div>
        )}

        {method === 'card' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400">Card number</label>
              <input
                inputMode="numeric"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                placeholder="1234 5678 9012 3456"
                className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Name on card</label>
              <input
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                placeholder="Full name"
                className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400">Expiry</label>
                <input
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  placeholder="MM/YY"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">CVV</label>
                <input
                  inputMode="numeric"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  placeholder="•••"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
                />
              </div>
            </div>
          </div>
        )}

        {(method === 'netbanking' || method === 'imps' || method === 'bank_transfer') && (
          <div>
            <label className="text-sm text-slate-400">Select your bank</label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none focus:border-brand-500/60"
            >
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs text-slate-500">
              You'll be redirected to your bank to authorise ₹
              {Number(amount).toLocaleString('en-IN')}.
            </p>
          </div>
        )}

        {method === 'crypto' && (
          <div className="rounded-xl border border-white/10 bg-surface-700 p-4">
            <p className="text-sm text-slate-400">Send exactly</p>
            <p className="text-xl font-bold text-white">
              ₹{Number(amount).toLocaleString('en-IN')} <span className="text-sm text-slate-500">in USDT</span>
            </p>
            <p className="mt-3 text-sm text-slate-400">To wallet address</p>
            <p className="break-all font-mono text-sm text-white">{ui.address}</p>
          </div>
        )}

        <button
          type="button"
          onClick={pay}
          className="mt-6 w-full rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400"
        >
          Pay ₹{Number(amount).toLocaleString('en-IN')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          Cancel
        </button>

        {SANDBOX && (
          <p className="mt-4 text-center text-[0.7rem] uppercase tracking-wide text-slate-600">
            Sandbox mode · no real charge
          </p>
        )}
      </div>
    </div>
  );
}
