'use client';

/**
 * Payment Methods — reference screens `/registerpaymentmethod` and
 * `/Paymentmethodlist` merged into one list-plus-form page.
 *
 * These rows are the PLATFORM's own receiving accounts — the UPI ID, bank
 * account or wallet a player sends money to — not anything belonging to a
 * player. The form therefore asks only for what the player must be shown.
 *
 * It is driven by the Type select: only the destination fields for the chosen
 * type are shown (UPI → UPI ID + QR code; bank → the receiving account; crypto
 * → network + wallet address; e-wallet → wallet id), and the player's deposit
 * page renders exactly that block under the method they pick. The API stores
 * the other types' fields as NULL (backoffice_reports.DESTINATION_FIELDS), so
 * what the admin sees and what the player is told can never disagree.
 *
 * Deliberately NOT here: a logo (no deposit page renders one), per-country and
 * per-currency lists (Front End Configuration Rules owns that gating, per
 * method), and a withdrawal toggle (payouts do not read this table).
 */

import CrudPage from '@/components/admin/CrudPage';
import { StatusBadge } from '@/components/admin/AdminShell';
import { col } from '@/components/admin/Backoffice';

const TYPE_LABELS = {
  upi: 'UPI',
  bank: 'Bank account',
  crypto: 'Crypto wallet',
  wallet: 'E-wallet',
  card: 'Card',
  other: 'Other',
};

const isType = (...types) => (form) => types.includes(form.method_type);

// What the player is told to pay into, compressed to one cell. Account numbers
// and wallet addresses are shortened: the full value is one Edit click away and
// does not belong in a table read over a shoulder.
function destinationSummary(r) {
  switch (r.method_type) {
    case 'upi':
      return r.upi_id || (r.qr_image_url ? 'QR code' : null);
    case 'bank': {
      if (!r.account_number) return null;
      return `${r.bank_name || 'Bank'} · A/C ••••${String(r.account_number).slice(-4)}`;
    }
    case 'crypto': {
      if (!r.wallet_address) return null;
      const addr = String(r.wallet_address);
      const short = addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
      return r.crypto_network ? `${r.crypto_network} · ${short}` : short;
    }
    case 'wallet':
      return r.account_number || null;
    default:
      return null;
  }
}

const COLUMNS = [
  col.number('id', 'ID'),
  col.text('name', 'Name'),
  col.text('code', 'Code'),
  {
    key: 'method_type',
    label: 'Type',
    render: (r) => (
      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-200">
        {TYPE_LABELS[r.method_type] ?? r.method_type ?? '—'}
      </span>
    ),
  },
  {
    key: 'destination',
    label: 'Player pays to',
    sortable: false,
    render: (r) => destinationSummary(r) ?? '—',
  },
  col.money('min_amount', 'Min'),
  {
    key: 'is_active',
    label: 'Status',
    render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} />,
  },
];

const FORM = [
  { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Google Pay, Axis Bank, USDT' },
  {
    name: 'code',
    label: 'Code',
    required: true,
    placeholder: 'e.g. upi, axis-bank, usdt-trc20',
    hint: 'Unique key; the player site sends it with each deposit.',
  },
  {
    name: 'method_type',
    label: 'Type',
    type: 'select',
    default: 'upi',
    options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },

  // What the player sees after picking this method — one block per type.
  {
    type: 'section',
    label: 'Shown to the player after they choose this method',
    hint: 'Only the fields for the selected type are shown on the deposit page. Switching type clears the others.',
  },
  // UPI: the QR is what most players scan; the ID is the fallback they type.
  { key: 'upi:id', name: 'upi_id', label: 'UPI ID', required: true, placeholder: 'name@bank', showWhen: isType('upi') },
  { key: 'upi:qr', name: 'qr_image_url', label: 'UPI QR code', type: 'image', placeholder: 'https://…/qr.png', showWhen: isType('upi') },
  { key: 'upi:payee', name: 'account_name', label: 'Payee name', placeholder: 'Mahakal World Pvt Ltd', showWhen: isType('upi') },
  // Bank: the receiving account, as the player must enter it in their app.
  { key: 'bank:holder', name: 'account_name', label: 'Account holder name', required: true, placeholder: 'Mahakal World Pvt Ltd', showWhen: isType('bank') },
  { key: 'bank:number', name: 'account_number', label: 'Account number', required: true, showWhen: isType('bank') },
  { key: 'bank:ifsc', name: 'ifsc_code', label: 'IFSC code', required: true, placeholder: 'UTIB0001234', showWhen: isType('bank') },
  { key: 'bank:name', name: 'bank_name', label: 'Bank name', placeholder: 'Axis Bank', showWhen: isType('bank') },
  { key: 'bank:branch', name: 'branch_name', label: 'Branch name', showWhen: isType('bank') },
  // Crypto: the address is useless without the chain it lives on.
  {
    key: 'crypto:network',
    name: 'crypto_network',
    label: 'Network',
    placeholder: 'USDT · TRC20',
    hint: 'Shown next to the address so the player sends on the right chain.',
    showWhen: isType('crypto'),
  },
  {
    key: 'crypto:address',
    name: 'wallet_address',
    label: 'Wallet address',
    required: true,
    full: true,
    placeholder: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    showWhen: isType('crypto'),
  },
  { key: 'crypto:qr', name: 'qr_image_url', label: 'Wallet QR code', type: 'image', showWhen: isType('crypto') },
  // E-wallet (Paytm wallet, etc.): identified by a wallet id or mobile number.
  { key: 'wallet:holder', name: 'account_name', label: 'Wallet holder name', showWhen: isType('wallet') },
  { key: 'wallet:number', name: 'account_number', label: 'Wallet ID / mobile number', required: true, showWhen: isType('wallet') },
  { key: 'wallet:qr', name: 'qr_image_url', label: 'Wallet QR code', type: 'image', showWhen: isType('wallet') },
  // Card / other have nothing to pay into; the instructions carry the how-to.
  {
    name: 'instructions',
    label: 'Instructions for player',
    type: 'textarea',
    full: true,
    placeholder: 'e.g. Add your username in the payment note',
  },

  // Deposit limits and ordering for this one account. Per-country / per-currency
  // gating is not here: Front End Configuration Rules owns that, per method.
  { type: 'section', label: 'Limits & availability' },
  { name: 'min_amount', label: 'Min deposit', type: 'number', default: '0' },
  { name: 'max_amount', label: 'Max deposit', type: 'number' },
  {
    name: 'sort_order',
    label: 'Sort order',
    type: 'number',
    default: '0',
    hint: 'Lower numbers appear first on the deposit page.',
  },
  {
    name: 'is_active',
    label: 'Show on deposit page',
    type: 'toggle',
    default: true,
    hint: 'Players can pay into this account',
  },
  // This screen only registers accounts players pay INTO, so every row it
  // saves is deposit-capable. Kept as a hidden constant rather than a toggle:
  // without it, editing a row that predates this screen would silently
  // re-save supports_deposit=false and keep it off the deposit page forever.
  { name: 'supports_deposit', type: 'hidden', value: true },
];

const FILTERS = [
  { name: 'name', label: 'Name' },
  {
    name: 'isActive',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
  },
];

export default function PaymentMethodsPage() {
  return (
    <CrudPage
      title="Payment Methods"
      subtitle="Register a payment method and review the existing list."
      path="/api/v1/admin/bo/payment-methods"
      createPath="/api/v1/admin/bo/payment-methods/create"
      filterFields={FILTERS}
      columns={COLUMNS}
      formFields={FORM}
      tableTitle="Payment Methods List"
      createLabel="Register payment method"
    />
  );
}
