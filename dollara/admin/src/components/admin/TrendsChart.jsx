'use client';

import { useMemo } from 'react';

/**
 * Trends line chart for the dashboard: counts (signups, active players) on the
 * left axis, currency amounts (deposits, withdrawals) on the right. Drawn as
 * inline SVG so the panel carries no charting dependency.
 */

const SERIES = [
  { key: 'signups', label: 'Signups', color: '#f43f5e', axis: 'left' },
  { key: 'activePlayers', label: 'Active Players', color: '#3b82f6', axis: 'left' },
  { key: 'deposits', label: 'Deposits', color: '#e2a03f', axis: 'right' },
  { key: 'withdrawals', label: 'Withdrawals', color: '#8b5cf6', axis: 'right' },
];

const W = 1600;
const H = 420;
const PAD = { top: 24, right: 64, bottom: 36, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** "Nice" axis maximum + tick step so gridlines land on round numbers. */
function niceScale(rawMax, targetTicks = 8) {
  if (!rawMax || rawMax <= 0) return { max: targetTicks, step: 1 };
  const rough = rawMax / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(rawMax / step) * step, step };
}

/** Catmull-Rom through the points, emitted as cubic beziers for smooth curves. */
function smoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const fmtTick = (n) =>
  n >= 1000 ? `${+(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`.replace('.0k', 'k') : `${+n.toFixed(2)}`;

export default function TrendsChart({ data }) {
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const { left, right, lines, xAt } = useMemo(() => {
    const leftMax = Math.max(
      ...rows.flatMap((r) => [Number(r.signups) || 0, Number(r.activePlayers) || 0]),
      0,
    );
    const rightMax = Math.max(
      ...rows.flatMap((r) => [Number(r.deposits) || 0, Number(r.withdrawals) || 0]),
      0,
    );
    const left = niceScale(leftMax);
    const right = niceScale(rightMax);

    const xAt = (i) =>
      rows.length <= 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (rows.length - 1)) * PLOT_W;
    const yAt = (v, scale) => PAD.top + PLOT_H - (Math.min(v, scale.max) / scale.max) * PLOT_H;

    const lines = SERIES.map((s) => ({
      ...s,
      points: rows.map((r, i) => ({
        x: xAt(i),
        y: yAt(Number(r[s.key]) || 0, s.axis === 'left' ? left : right),
      })),
    }));

    return { left, right, lines, xAt };
  }, [rows]);

  if (!rows.length) {
    return <p className="py-16 text-center text-sm text-slate-500">No trend data yet</p>;
  }

  const leftTicks = Array.from({ length: Math.round(left.max / left.step) + 1 }, (_, i) => i * left.step);
  const rightTicks = Array.from({ length: Math.round(right.max / right.step) + 1 }, (_, i) => i * right.step);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-5">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-xs text-slate-300">
            <span
              className="block h-3 w-8 rounded-sm border-2"
              style={{ borderColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto max-h-[30rem] w-full"
          role="img"
          aria-label="Trends for the last 7 days"
        >
          {/* horizontal gridlines, one per left-axis tick */}
          {leftTicks.map((t) => {
            const y = PAD.top + PLOT_H - (t / left.max) * PLOT_H;
            return (
              <line
                key={`g${t}`}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
              />
            );
          })}
          {/* vertical gridlines, one per day */}
          {rows.map((r, i) => (
            <line
              key={`v${r.date ?? i}`}
              x1={xAt(i)}
              x2={xAt(i)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="#1e293b"
              strokeWidth="1"
            />
          ))}

          {leftTicks.map((t) => (
            <text
              key={`lt${t}`}
              x={PAD.left - 12}
              y={PAD.top + PLOT_H - (t / left.max) * PLOT_H}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-400"
              fontSize="17"
            >
              {fmtTick(t)}
            </text>
          ))}
          {rightTicks.map((t) => (
            <text
              key={`rt${t}`}
              x={W - PAD.right + 12}
              y={PAD.top + PLOT_H - (t / right.max) * PLOT_H}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-slate-400"
              fontSize="17"
            >
              {fmtTick(t)}
            </text>
          ))}
          {rows.map((r, i) => (
            <text
              key={`x${r.date ?? i}`}
              x={xAt(i)}
              y={PAD.top + PLOT_H + 24}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize="17"
            >
              {r.date ?? r.label}
            </text>
          ))}

          {lines.map((s) => (
            <g key={s.key}>
              <path
                d={smoothPath(s.points)}
                fill="none"
                stroke={s.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#0f172a"
                  stroke={s.color}
                  strokeWidth="2"
                >
                  <title>{`${s.label} · ${rows[i].date ?? rows[i].label}: ${rows[i][s.key] ?? 0}`}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
