import { money, num } from '../../../lib/format';

// The dashboard's coloured tiles. Gradients are named by role so a screen picks
// "deposits", not a pair of hex values it then has to keep in step with the
// tile beside it.
const TONES = {
  violet: 'from-violet-600 to-purple-500',
  blue: 'from-blue-600 to-sky-400',
  amber: 'from-orange-500 to-amber-400',
  rose: 'from-rose-500 to-rose-400',
  emerald: 'from-emerald-500 to-emerald-400',
};

export default function StatTile({ title, tone = 'blue', value, lines = [], footer }) {
  return (
    <div
      className={`flex min-h-[130px] flex-col justify-between rounded bg-gradient-to-r ${
        TONES[tone] ?? TONES.blue
      } p-5 text-white shadow-card`}
    >
      <div>
        <h3 className="text-lg font-bold">{title}</h3>

        {value !== undefined && (
          <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        )}

        {lines.length > 0 && (
          <dl className="mt-2 space-y-0.5 text-sm font-medium">
            {lines.map(({ label, value: lineValue }) => (
              <div key={label} className="flex gap-1">
                <dt>{label}:</dt>
                <dd className="tabular-nums">{lineValue}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {footer && (
        <div className="mt-4 flex items-center justify-between text-xs text-white/80">
          {footer}
        </div>
      )}
    </div>
  );
}

/** Convenience wrappers so callers do not re-import the formatters. */
StatTile.money = money;
StatTile.num = num;
