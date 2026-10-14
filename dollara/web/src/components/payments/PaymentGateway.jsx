'use client';

// Deposit checkout surface. The Paygate order + Razorpay widget live in
// `usePaygateDeposit`; this component is the pay button + status copy that
// theme pages drop in. The browser never sees merchant API keys.
// Payment success queues the deposit for admin approval — wallet credit is
// not immediate.

import { Loader2, Lock } from 'lucide-react';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';

function receiptCopy(receipt) {
  const amount = `₹${Number(receipt.amount).toLocaleString('en-IN')}`;
  if (receipt.status === 'success') {
    return {
      title: 'Deposit successful',
      body: `${amount} has been credited to your wallet.`,
    };
  }
  if (receipt.status === 'failed') {
    return {
      title: 'Payment failed',
      body: 'The payment did not go through. You can try again with a new deposit.',
    };
  }
  if (receipt.status === 'awaiting_approval') {
    return {
      title: 'Payment received',
      body: `${amount} is awaiting admin approval. It will be credited to your wallet once approved.`,
    };
  }
  return {
    title: 'Payment pending',
    body: 'We have not received confirmation yet. This page will update once the gateway confirms.',
  };
}

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
    const { title, body } = receiptCopy(receipt);
    return (
      <div className={receiptClassName}>
        <p className={receiptTitleClassName}>{title}</p>
        <p className={receiptBodyClassName}>{body}</p>
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
