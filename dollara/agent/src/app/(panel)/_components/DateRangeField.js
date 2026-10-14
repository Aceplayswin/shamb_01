'use client';

import { Calendar } from 'lucide-react';
import { fmtRangeLabel } from '../../../lib/format';

/**
 * The panel's period control: one field showing `MM/DD/YYYY - MM/DD/YYYY`,
 * two native date inputs behind it.
 *
 * Two native inputs rather than a date-range picker dependency — they carry
 * their own calendar, keyboard support and locale for free, and this control
 * is the only date UI in the app.
 */
export default function DateRangeField({ from, to, onChange, label, id = 'period' }) {
  return (
    <div>
      {label && (
        <span className="field-label" id={`${id}-label`}>
          {label}
        </span>
      )}
      <div
        className="flex flex-wrap items-center gap-2 rounded border border-hairline bg-shell-bg px-3 py-2"
        role="group"
        aria-labelledby={label ? `${id}-label` : undefined}
      >
        <Calendar className="h-4 w-4 shrink-0 text-ink-faint" />
        <input
          type="date"
          aria-label="From date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange(e.target.value, to)}
          className="bg-transparent text-sm text-ink focus:outline-none"
        />
        <span className="text-ink-faint">–</span>
        <input
          type="date"
          aria-label="Until date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange(from, e.target.value)}
          className="bg-transparent text-sm text-ink focus:outline-none"
        />
        <span className="ml-auto hidden text-xs tabular-nums text-ink-faint lg:inline">
          {fmtRangeLabel(from, to)}
        </span>
      </div>
    </div>
  );
}
