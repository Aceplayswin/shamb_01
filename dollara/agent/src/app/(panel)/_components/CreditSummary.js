import { money, signClass } from '../../../lib/format';

/**
 * The strip above every report: what credit moved in the period, and what is
 * left to move.
 *
 * Balance Down and Balance Up are period totals; Net Exposure and Available
 * Credit are live positions. They sit together because that is the question an
 * agent is actually asking — "what did I hand out, and what can I still hand
 * out" — but the labels keep the two kinds apart.
 */
export default function CreditSummary({ summary }) {
  const items = [
    { label: 'Balance Down', value: summary?.balanceDown, signed: false },
    { label: 'Balance Up', value: summary?.balanceUp, signed: false },
    { label: 'Net Exposure', value: summary?.netExposure, signed: true },
    { label: 'Available Credit', value: summary?.availableCredit, signed: true },
  ];

  return (
    <div className="card flex flex-wrap items-center gap-x-10 gap-y-3 px-6 py-4">
      {items.map(({ label, value, signed }) => (
        <div key={label} className="flex items-center gap-2 text-sm">
          <span className="text-ink">{label} :</span>
          <span
            className={`font-semibold tabular-nums ${
              signed ? signClass(value) : 'text-up'
            }`}
          >
            {money(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
