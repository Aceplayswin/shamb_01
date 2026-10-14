'use client';

// Player deposit checkout: create a Paygate order, open Razorpay with the
// per-order payload, verify the result, then poll until the wallet is credited.
// Merchant keys stay on the API; this hook only sees the one-order checkout object.

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
  if (data.status === 'pending' && attempt < 6) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return pollStatus(transactionId, attempt + 1);
  }
  return data;
}

export function usePaygateDeposit() {
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setReceipt(null);
  }, []);

  const pay = useCallback(
    async ({ amount, paymentMethod } = {}) => {
      setError(null);
      setReceipt(null);
      setPaying(true);
      try {
        const Razorpay = await loadRazorpay();
        const checkoutData = await api('/api/v1/wallet/deposit/checkout', {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(amount),
            paymentMethod: paymentMethod || 'paygate',
            ...affiliateAttribution(),
          }),
        });

        const { orderId, checkout, byteTransactionId, transactionId } = checkoutData;
        if (!checkout?.key || !checkout?.order_id) {
          throw new Error('Gateway did not return a checkout payload.');
        }

        const settled = await new Promise((resolve, reject) => {
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
                try {
                  await api('/api/v1/wallet/deposit/abandon', {
                    method: 'POST',
                    body: JSON.stringify({ transactionId }),
                  });
                } catch {
                  // Next checkout cancels leftover processing rows.
                }
                fail(new Error('Payment cancelled. You can try again.'));
              },
            },
          });

          rzp.on('payment.failed', (resp) => {
            fail(new Error(resp.error?.description || 'Payment failed.'));
          });
          rzp.open();
        });

        setReceipt(settled);
        if (settled?.status === 'success') refreshSession?.();
        return settled;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed.';
        setError(message);
        throw err;
      } finally {
        setPaying(false);
      }
    },
    [refreshSession],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const tx = new URLSearchParams(window.location.search).get('tx');
    if (!tx || !/^\d+$/.test(tx)) return undefined;
    let cancelled = false;
    setPaying(true);
    pollStatus(tx)
      .then((data) => {
        if (cancelled) return;
        setReceipt(data);
        if (data.status === 'success') refreshSession?.();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load payment status.');
        }
      })
      .finally(() => {
        if (!cancelled) setPaying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  return { pay, paying, error, receipt, reset };
}

export default usePaygateDeposit;
