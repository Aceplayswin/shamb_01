'use client';

// Deposit checkout surface. The Paygate order + Razorpay widget live in
// `usePaygateDeposit`; this component is the pay button + status copy that
// theme pages drop in. The browser never sees merchant API keys.

import { Loader2, Lock } from 'lucide-react';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';

export function PaymentGateway({
  amount,
  paymentMethod,
  disabled = false,
  onUnauthorized,
  payClassName,
  processingClassName,
  errorClassName,
  receiptClassName,
  receiptTitleClassName,
  receiptBodyClassName,
}) {
  const { pay, paying, error, receipt } = usePaygateDeposit();
  const validAmount = Number(amount) > 0;

  const onPay = async () => {
    try {
      await pay({ amount, paymentMethod });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (onUnauthorized && /log in again|unauthorized/i.test(msg)) onUnauthorized();
    }
  };

  if (receipt) {
    const ok = receipt.status === 'success';
    const failed = receipt.status === 'failed';
    return (
      <div className={receiptClassName}>
        <p className={receiptTitleClassName}>
          {ok ? 'Deposit successful' : failed ? 'Payment failed' : 'Payment pending'}
        </p>
        <p className={receiptBodyClassName}>
          {ok
            ? `₹${Number(receipt.amount).toLocaleString('en-IN')} has been credited to your wallet.`
            : failed
              ? 'The payment did not go through. You can try again with a new deposit.'
              : 'We have not received confirmation yet. This page will update once the gateway confirms.'}
        </p>
        <p className={receiptBodyClassName}>Request ID: {receipt.transactionId}</p>
      </div>
    );
  }

  if (paying) {
    return (
      <div className={processingClassName}>
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        <p>Opening secure payment…</p>
      </div>
    );
  }

  return (
    <div>
      {error ? <p className={errorClassName}>{error}</p> : null}
      <button
        type="button"
        onClick={onPay}
        disabled={disabled || paying || !validAmount}
        className={payClassName}
      >
        Pay ₹{Number(amount || 0).toLocaleString('en-IN')}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1 text-xs opacity-70">
        <Lock className="h-3.5 w-3.5" /> Secure checkout
      </p>
    </div>
  );
}

export default PaymentGateway;
