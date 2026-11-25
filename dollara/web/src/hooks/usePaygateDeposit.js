'use client';

// Player deposit checkout for every payment gateway. The API answers the
// checkout request with a `flow`:
//   • 'widget'   (Paygate) — open Razorpay with the per-order payload, verify
//                the result, then poll until the payment settles.
//   • 'redirect' (P2P·PAY) — send the player to the gateway's hosted page;
//                they come back to /deposit?tx=<id> and we poll from there.
// Wallet credit happens only after the gateway confirms (and, unless the
// operator turned on auto-credit, an admin approves). Merchant keys stay on
// the API; this hook only sees one order's checkout object / URL.

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { affiliateAttribution } from '@/lib/referral';
import { useAuthStore } from '@/store/auth';

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Checkout is only available in the browser.'));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const existing = document.querySelector(`script[src="${RAZORPAY_SRC}"]`);
    const onReady = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Could not load the payment checkout.'));
    };
    if (existing) {
      existing.addEventListener('load', onReady);
      existing.addEventListener('error', () =>
        reject(new Error('Could not load the payment checkout.')),
      );
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SRC;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error('Could not load the payment checkout.'));
    document.body.appendChild(script);
  });
}

async function pollStatus(transactionId, attempt = 0) {
  const data = await api(`/api/v1/wallet/deposit/order/${transactionId}`);
  // Keep polling only while the gateway has not settled yet. Admin-wait
  // (`awaiting_approval`) and terminal states stop the loop.
  if (data.status === 'pending' && attempt < 6) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return pollStatus(transactionId, attempt + 1);
  }
  return data;
}

function shouldRefreshSession(status) {
  return status === 'success' || status === 'awaiting_approval';
}

async function abandon(transactionId) {
  try {
    await api('/api/v1/wallet/deposit/abandon', {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    });
  } catch {
    // Next checkout cancels leftover processing rows.
  }
}

// Only ever navigate to an http(s) URL the API handed back.
function safeCheckoutUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function runRazorpay(Razorpay, { orderId, checkout, byteTransactionId, transactionId }) {
  return new Promise((resolve, reject) => {
    let done = false;
    let paid = false;
    const finish = (fn) => (value) => {
      if (done) return;
      done = true;
      fn(value);
    };
    const succeed = finish(resolve);
    const fail = finish(reject);

    const rzp = new Razorpay({
      key: checkout.key,
      order_id: checkout.order_id,
      amount: checkout.amount,
      currency: checkout.currency || 'INR',
      name: checkout.name || 'Deposit',
      description: checkout.description || `Deposit ${orderId}`,
      prefill: checkout.prefill || {},
      notes: checkout.notes || {},
      theme: checkout.theme || { color: '#5b8cff' },
      handler: async (response) => {
        paid = true;
        try {
          await api('/api/v1/wallet/deposit/verify', {
            method: 'POST',
            body: JSON.stringify({
              transactionId,
              orderId,
              byteTransactionId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
        } catch {
          // Status poll covers verify races and webhook-only confirmation.
        }
        try {
          succeed(await pollStatus(transactionId));
        } catch (err) {
          fail(err);
        }
      },
      modal: {
        ondismiss: async () => {
          if (paid) return;
          await abandon(transactionId);
          fail(new Error('Payment cancelled. You can try again.'));
        },
      },
    });

    rzp.on('payment.failed', (resp) => {
      fail(new Error(resp.error?.description || 'Payment failed.'));
    });
    rzp.open();
  });
}

export function usePaygateDeposit() {
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const [paying, setPaying] = useState(false);
  // Leaving for a hosted checkout page (redirect flow).
  const [redirecting, setRedirecting] = useState(false);
  // Back from a hosted checkout page, waiting on the final status.
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setReceipt(null);
  }, []);

  // `gateway` is the code picked on the deposit page; omitted, the API uses
  // the first configured gateway.
  const pay = useCallback(
    async ({ amount, paymentMethod, gateway } = {}) => {
      setError(null);
      setReceipt(null);
      setPaying(true);
      let leaving = false;
      try {
        const checkoutData = await api('/api/v1/wallet/deposit/checkout', {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(amount),
            ...(gateway ? { gateway } : {}),
            paymentMethod: paymentMethod || gateway || 'paygate',
            ...affiliateAttribution(),
          }),
        });

        if (checkoutData.flow === 'redirect') {
          const url = safeCheckoutUrl(checkoutData.checkoutUrl);
          if (!url) throw new Error('Gateway did not return a payment page.');
          leaving = true;
          setRedirecting(true);
          window.location.assign(url);
          return { redirecting: true, transactionId: checkoutData.transactionId };
        }

        const { checkout, transactionId } = checkoutData;
        if (!checkout?.key || !checkout?.order_id) {
          await abandon(transactionId);
          throw new Error('Gateway did not return a checkout payload.');
        }
        let Razorpay;
        try {
          Razorpay = await loadRazorpay();
        } catch (err) {
          await abandon(transactionId);
          throw err;
        }

        const settled = await runRazorpay(Razorpay, checkoutData);
        setReceipt(settled);
        if (shouldRefreshSession(settled?.status)) refreshSession?.();
        return settled;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed.';
        setError(message);
        throw err;
      } finally {
        // On redirect the page is unloading — keep the busy state so the
        // button cannot be pressed twice while the browser navigates.
        if (!leaving) setPaying(false);
      }
    },
    [refreshSession],
  );

  // Back from the gateway: /deposit?tx=<id>[&orderId=…&status=…]. The status
  // in the URL is never trusted — the API asks the gateway / reads the webhook.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const match = /^(\d+)/.exec(params.get('tx') || '');
    if (!match) return undefined;
    const tx = match[1];
    let cancelled = false;
    setPaying(true);
    setResuming(true);
    pollStatus(tx)
      .then((data) => {
        if (cancelled) return;
        setReceipt(data);
        if (shouldRefreshSession(data.status)) refreshSession?.();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load payment status.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPaying(false);
          setResuming(false);
          // Drop the return params (only once the status is in, so a dev
          // StrictMode re-run still sees them) so "New deposit" starts clean.
          window.history.replaceState(window.history.state, '', window.location.pathname);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  return { pay, paying, redirecting, resuming, error, receipt, reset };
}

export default usePaygateDeposit;
