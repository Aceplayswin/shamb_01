'use client';

// Theme5 Withdraw — shared wallet endpoints, light portal style.

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { T5Card, t5Input, t5Select, t5BtnPrimary, T5FormPage } from '../components/ui';

// Kept in step with services.WITHDRAWAL_DESTINATION_FIELDS on the API side.
const REQUIRED_FIELDS = {
  bank_transfer: ['accountName', 'accountNumber', 'ifsc', 'bankName'],
  upi: ['upiId'],
  crypto: ['network', 'walletAddress'],
};

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-[#0f1b33]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] text-[#94a3b8]">{hint}</span>}
    </label>
  );
}

export default function Theme5Withdraw() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [destination, setDestination] = useState({});
  const [loading, setLoading] = useState(false);

  // Only the active method's fields are sent — switching method clears the old
  // ones so a stale UPI id can't ride along with a bank request.
  const setField = (key) => (e) =>
    setDestination((prev) => ({ ...prev, [key]: e.target.value }));

  // Mirrors services.WITHDRAWAL_DESTINATION_FIELDS: the server validates these
  // too, this just stops the player submitting a request it would reject.
  const destinationComplete = REQUIRED_FIELDS[method].every(
    (key) => (destination[key] ?? '').trim() !== '',
  );

  const loadWallet = () => api('/api/v1/wallet').then(setWallet).catch(() => {});

  useEffect(() => {
    loadWallet();
  }, []);

  const numAmount = parseFloat(amount) || 0;
  // Only real money is withdrawable — `available` excludes the bonus balance,
  // which has to clear its wagering requirement first.
  const withdrawable = wallet ? (wallet.withdrawable ?? wallet.available) : 0;
  // One request at a time: the API refuses a new one until the admin approves
  // or rejects the open request, so the form stays locked until then.
  const hasPending = Boolean(wallet?.hasPendingWithdrawal);

  const submit = async () => {
    setLoading(true);
    try {
      await api('/api/v1/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod: method,
          destination,
        }),
      });
      alert('Withdrawal request submitted — pending approval. The amount is held until our team approves or rejects it.');
      setAmount('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
      // Picks up the new hold and pending flag (or one placed from another tab).
      loadWallet();
    }
  };

  return (
    <T5FormPage
      title="Withdraw"
      subtitle={wallet ? `Withdrawable: ₹${withdrawable.toLocaleString('en-IN')}` : undefined}
      tabs={[
        { label: 'Deposit', href: '/deposit' },
        { label: 'Withdrawals', href: '/withdraw', active: true },
      ]}
    >
      <T5Card className="mt-4 p-6">
        {hasPending ? (
          <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
            You have a withdrawal request awaiting approval. You can place a new
            request once it has been approved or rejected.
          </p>
        ) : null}
        {wallet?.bonus > 0 ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Your ₹{Number(wallet.bonus).toLocaleString('en-IN')} bonus balance can be
            played with but not withdrawn. It becomes withdrawable once it meets its
            wagering requirement.
          </p>
        ) : null}
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className={`${t5Input} text-2xl`}
        />
      </T5Card>

      <select
        value={method}
        onChange={(e) => {
          setMethod(e.target.value);
          setDestination({});
        }}
        className={`${t5Select} mt-4`}
      >
        <option value="bank_transfer">Bank Transfer</option>
        <option value="upi">UPI</option>
        <option value="crypto">Cryptocurrency</option>
      </select>

      <T5Card className="mt-4 space-y-3 p-5">
        {method === 'upi' && (
          <Field label="UPI ID" hint="For example name@okaxis">
            <input
              className={t5Input}
              value={destination.upiId ?? ''}
              onChange={setField('upiId')}
              placeholder="name@bank"
              autoComplete="off"
            />
          </Field>
        )}

        {method === 'bank_transfer' && (
          <>
            <Field label="Account holder name">
              <input
                className={t5Input}
                value={destination.accountName ?? ''}
                onChange={setField('accountName')}
                placeholder="As printed on the bank account"
              />
            </Field>
            <Field label="Account number">
              <input
                className={t5Input}
                value={destination.accountNumber ?? ''}
                onChange={setField('accountNumber')}
                inputMode="numeric"
                placeholder="Digits only"
                autoComplete="off"
              />
            </Field>
            <Field label="IFSC code">
              <input
                className={`${t5Input} uppercase`}
                value={destination.ifsc ?? ''}
                onChange={setField('ifsc')}
                placeholder="HDFC0001234"
                autoComplete="off"
              />
            </Field>
            <Field label="Bank Name">
              <input
                className={t5Input}
                value={destination.bankName ?? ''}
                onChange={setField('bankName')}
                placeholder="e.g. HDFC Bank"
                autoComplete="off"
              />
            </Field>
          </>
        )}

        {method === 'crypto' && (
          <>
            <Field label="Network">
              <select
                className={t5Select}
                value={destination.network ?? ''}
                onChange={setField('network')}
              >
                <option value="">Select network</option>
                <option value="TRC20">USDT — TRC20</option>
                <option value="ERC20">USDT — ERC20</option>
                <option value="BEP20">USDT — BEP20</option>
              </select>
            </Field>
            <Field label="Wallet address" hint="Paid out to this address exactly as entered.">
              <input
                className={t5Input}
                value={destination.walletAddress ?? ''}
                onChange={setField('walletAddress')}
                placeholder="Destination wallet address"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </>
        )}
      </T5Card>

      <button
        type="button"
        onClick={submit}
        disabled={loading || hasPending || numAmount < 500 || !destinationComplete}
        className={`${t5BtnPrimary} mt-4 w-full`}
      >
        {hasPending ? 'Withdrawal Pending Approval' : 'Request Withdrawal'}
      </button>
    </T5FormPage>
  );
}
