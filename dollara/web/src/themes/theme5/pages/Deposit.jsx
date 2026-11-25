'use client';

// Theme5 Deposit — amount, payment gateway, then checkout (Paygate's popup or
// P2P·PAY's hosted UPI / bank page). Payment success queues for admin
// approval; the wallet is credited only when an admin approves.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Lock, Smartphone } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';
import { useDepositGateways } from '@/hooks/useDepositGateways';
import { T5Card, t5Input, t5BtnPrimary, T5FormPage } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const GATEWAY_ICONS = { card: CreditCard, upi: Smartphone };

export default function Theme5Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();
  const { pay, paying, redirecting, resuming, error: payError, receipt, reset } =
    usePaygateDeposit();
  const {
    gateways,
    selected: gateway,
    selectedGateway,
    setSelected: setGateway,
    loading: gatewaysLoading,
    error: gatewaysError,
  } = useDepositGateways(Boolean(token));
  const [amount, setAmount] = useState('');
  const [hasPending, setHasPending] = useState(false);
  const numAmount = parseFloat(amount) || 0;
  const canPay =
    !paying && !hasPending && numAmount >= MIN_DEPOSIT && !receipt && Boolean(gateway);

  const loadPending = () =>
    api('/api/v1/wallet')
      .then((w) => setHasPending(Boolean(w?.hasPendingDeposit)))
      .catch(() => {});

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  useEffect(() => {
    if (token) loadPending();
  }, [token]);

  const submit = async () => {
    if (!canPay) return;
    try {
      await pay({ amount: numAmount, gateway });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (/log in again|unauthorized/i.test(msg)) router.replace('/login');
    }
  };

  const payLabel = hasPending
    ? 'Deposit Pending Approval'
    : resuming
      ? 'Checking payment…'
      : redirecting
        ? 'Taking you to payment…'
        : paying
          ? 'Opening payment…'
          : `Pay ₹${numAmount.toLocaleString('en-IN')}`;

  return (
    <T5FormPage
      title="Deposit"
      tabs={[
        { label: 'Deposit', href: '/deposit', active: true },
        { label: 'Withdrawals', href: '/withdraw' },
      ]}
    >
      {hasPending && !receipt && !resuming ? (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
          You have a deposit request awaiting approval. You can place a new
          request once it has been approved or rejected.
        </p>
      ) : null}
      <T5Card className="mt-4 p-6">
        <label className="text-sm text-[#64748b]">Enter Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={`${t5Input} mt-2 text-2xl`}
          disabled={Boolean(receipt) || paying}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              disabled={Boolean(receipt) || paying}
              className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#0f1b33] shadow-sm transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] disabled:opacity-50"
            >
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#94a3b8]">Minimum deposit ₹{MIN_DEPOSIT}.</p>
      </T5Card>

      {!receipt ? (
        <T5Card className="mt-4 p-6">
          <p id="t5-gateway-label" className="text-sm text-[#64748b]">
            Payment method
          </p>
          {gatewaysLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading payment methods…
            </p>
          ) : gatewaysError || gateways.length === 0 ? (
            <p className="mt-3 text-sm text-[#64748b]">
              {gatewaysError || 'No payment methods are available right now. Please try again later.'}
            </p>
          ) : (
            <div role="radiogroup" aria-labelledby="t5-gateway-label" className="mt-3 space-y-2">
              {gateways.map((g) => {
                const Icon = GATEWAY_ICONS[g.icon] ?? CreditCard;
                const active = g.code === gateway;
                return (
                  <button
                    key={g.code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={paying}
                    onClick={() => setGateway(g.code)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left shadow-sm transition disabled:opacity-60 ${
                      active
                        ? 'border-[#1d4ed8] bg-[#eff4ff]'
                        : 'border-black/10 bg-white hover:border-[#1d4ed8]/50'
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                        active ? 'bg-[#1d4ed8] text-white' : 'bg-[#f1f5f9] text-[#0f1b33]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[#0f1b33]">{g.name}</span>
                      {g.description && (
                        <span className="mt-0.5 block text-xs text-[#64748b]">{g.description}</span>
                      )}
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                        active ? 'border-[#1d4ed8]' : 'border-black/20'
                      }`}
                    >
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </T5Card>
      ) : null}

      {payError && !receipt ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {payError}
        </p>
      ) : null}

      {!receipt ? (
        <>
          <button type="button" onClick={submit} disabled={!canPay} className={`${t5BtnPrimary} mt-4 w-full`}>
            {payLabel}
          </button>
          {selectedGateway && !hasPending ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#94a3b8]">
              <Lock className="h-3.5 w-3.5" />
              {selectedGateway.flow === 'redirect'
                ? 'You will finish paying on a secure page, then come back here.'
                : 'A secure checkout window will open.'}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-[#1d4ed8]/25 bg-[#eff4ff] p-4 text-center">
          <p className="text-sm font-black text-[#1d4ed8]">
            {receipt.status === 'success'
              ? 'Deposit successful'
              : receipt.status === 'failed'
                ? 'Payment failed'
                : receipt.status === 'awaiting_approval'
                  ? 'Payment received'
                  : 'Payment pending'}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            {receipt.status === 'success'
              ? `₹${Number(receipt.amount).toLocaleString('en-IN')} credited · ID ${receipt.transactionId}`
              : receipt.status === 'awaiting_approval'
                ? `₹${Number(receipt.amount).toLocaleString('en-IN')} awaiting admin approval · ID ${receipt.transactionId}`
                : `Request ID: ${receipt.transactionId}`}
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
              setAmount('');
              loadPending();
            }}
            className={`${t5BtnPrimary} mt-4 w-full`}
          >
            New deposit
          </button>
        </div>
      )}
    </T5FormPage>
  );
}
