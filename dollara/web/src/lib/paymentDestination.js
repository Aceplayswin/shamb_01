// Deposit destination vocabulary shared by every theme's Deposit page.
//
// A payment method's TYPE decides what the player is told to pay into: UPI
// shows the QR code + UPI ID, bank the receiving account, crypto the network +
// wallet address, e-wallet the wallet id. This mirrors the server's per-type
// rules (api/core/backoffice_reports.py DESTINATION_FIELDS): the admin form
// captures only those fields for a type and the API stores the rest as NULL, so
// themes must render the rows this module returns rather than invent their own
// mapping — that is what keeps five themes and the admin console in agreement.

export const TYPE_LABELS = {
  upi: 'UPI',
  bank: 'Bank transfer',
  crypto: 'Crypto',
  wallet: 'E-wallet',
  card: 'Card',
  other: 'Other',
};

export const TYPE_HINTS = {
  upi: 'Scan the QR code or pay to the UPI ID',
  bank: 'NEFT / IMPS / RTGS to the account below',
  crypto: 'Send to the wallet address on the network shown',
  wallet: 'Send to the wallet ID below',
  card: 'Follow the instructions below',
  other: 'Follow the instructions below',
};

const present = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// Rows to show under the chosen method, in display order. Values the admin
// left blank are skipped so the player never sees an empty "Branch —".
// `mono` marks values the player copies character-for-character.
export function destinationRows(method) {
  if (!method) return [];
  const rows = [];
  const add = (label, value, extra = {}) => {
    if (present(value)) rows.push({ label, value: String(value).trim(), ...extra });
  };
  switch (method.method_type) {
    case 'upi':
      add('UPI ID', method.upi_id, { mono: true });
      add('Payee name', method.account_name);
      break;
    case 'bank':
      add('Account holder', method.account_name);
      add('Account number', method.account_number, { mono: true });
      add('IFSC', method.ifsc_code, { mono: true });
      add('Bank', method.bank_name);
      add('Branch', method.branch_name);
      break;
    case 'crypto':
      add('Network', method.crypto_network);
      add('Wallet address', method.wallet_address, { mono: true });
      break;
    case 'wallet':
      add('Wallet holder', method.account_name);
      add('Wallet ID / number', method.account_number, { mono: true });
      break;
    default:
      break;
  }
  return rows;
}

// A QR code only makes sense for methods that are paid by scanning.
export function showsQr(method) {
  return Boolean(
    method &&
      present(method.qr_image_url) &&
      ['upi', 'crypto', 'wallet'].includes(method.method_type),
  );
}

export function hasDestination(method) {
  return (
    Boolean(method) &&
    (destinationRows(method).length > 0 || showsQr(method) || present(method.instructions))
  );
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function limits(method) {
  const min = Number(method?.min_amount ?? 0) || 0;
  const max = present(method?.max_amount) ? Number(method.max_amount) || null : null;
  return { min, max };
}

// Whether `amount` is acceptable for the method, with a message the page can
// show verbatim. The API records the deposit regardless, so this is the only
// place the player learns about a per-method limit before paying.
export function amountWithinLimits(method, amount) {
  if (!method) return { ok: true, message: null };
  const { min, max } = limits(method);
  const n = Number(amount) || 0;
  if (min > 0 && n < min) {
    return { ok: false, message: `Minimum deposit for ${method.name} is ${inr(min)}.` };
  }
  if (max && n > max) {
    return { ok: false, message: `Maximum deposit for ${method.name} is ${inr(max)}.` };
  }
  return { ok: true, message: null };
}

export function limitsText(method) {
  const { min, max } = limits(method);
  const parts = [];
  if (min > 0) parts.push(`Min ${inr(min)}`);
  if (max) parts.push(`Max ${inr(max)}`);
  return parts.join(' · ');
}

// Secondary line for the option card: what kind of transfer it is, plus limits.
export function methodDescription(method) {
  if (!method) return '';
  const base =
    method.method_type === 'bank' && present(method.bank_name)
      ? method.bank_name
      : (TYPE_HINTS[method.method_type] ?? TYPE_HINTS.other);
  const lim = limitsText(method);
  return lim ? `${base} · ${lim}` : base;
}
