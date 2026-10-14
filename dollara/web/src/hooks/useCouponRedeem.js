'use client';

// Coupon-code redemption. Shared by every theme's bonus page: the code form is
// pure logic (validate → redeem → refresh the ledger), so only the markup
// differs per theme.
//
// Two endpoints back this:
//   POST /bonuses/claim/preview — checks a code without consuming it, so the
//     player sees "₹100, ready to redeem" (or why not) before committing.
//   POST /bonuses/claim         — the redemption itself. One per player per
//     campaign, enforced server-side inside a locked transaction.

import { useCallback, useState } from 'react';
import { api } from '@/services/api';

export function useCouponRedeem({ onRedeemed } = {}) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  // The preview result for the code currently typed, or null.
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Codes are stored upper-case; normalising as the player types means the
  // preview and the redeem hit the same row regardless of how they typed it.
  const onCodeChange = useCallback((value) => {
    setCode(value.toUpperCase().replace(/\s+/g, ''));
    setPreview(null);
    setError('');
    setSuccess(null);
  }, []);

  const check = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter a coupon code.');
      return null;
    }
    setChecking(true);
    setError('');
    try {
      const res = await api('/api/v1/bonuses/claim/preview', {
        method: 'POST',
        body: JSON.stringify({ code: trimmed }),
      });
      setPreview(res);
      if (!res.valid) setError(res.error || 'This code cannot be redeemed.');
      return res;
    } catch (err) {
      setError(err.message || 'Could not check that code.');
      return null;
    } finally {
      setChecking(false);
    }
  }, [code]);

  const redeem = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter a coupon code.');
      return null;
    }
    setRedeeming(true);
    setError('');
    setSuccess(null);
    try {
      const res = await api('/api/v1/bonuses/claim', {
        method: 'POST',
        body: JSON.stringify({ code: trimmed }),
      });
      setSuccess(res);
      setCode('');
      setPreview(null);
      // Let the page pull the new bonus row + wallet in.
      await onRedeemed?.(res);
      return res;
    } catch (err) {
      setError(err.message || 'Could not redeem that code.');
      return null;
    } finally {
      setRedeeming(false);
    }
  }, [code, onRedeemed]);

  const reset = useCallback(() => {
    setCode('');
    setPreview(null);
    setError('');
    setSuccess(null);
  }, []);

  return {
    code,
    onCodeChange,
    check,
    redeem,
    reset,
    checking,
    redeeming,
    preview,
    error,
    success,
    busy: checking || redeeming,
  };
}
