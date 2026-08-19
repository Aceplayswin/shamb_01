'use client';

/**
 * The agent hierarchy, rendered.
 *
 * Its own module rather than a helper inside one of the /agents pages: three
 * screens show a level and a Next.js `page.jsx` may only export the route's
 * default, so there is nowhere in those files for a shared export to live.
 */

// Ordered top-down, matching Agent.LEVEL_ORDER on the server. The colour says
// how high in the tree an account sits at a glance, which the level name alone
// does not on a table of two hundred rows.
export const LEVEL_COLORS = {
  super_admin:  'border-violet-500/30 bg-violet-500/15 text-violet-400',
  admin:        'border-sky-500/30 bg-sky-500/15 text-sky-400',
  super_master: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
  master:       'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  agent:        'border-slate-400/30 bg-slate-400/15 text-slate-300',
};

export function LevelBadge({ level, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
        LEVEL_COLORS[level] || LEVEL_COLORS.agent
      }`}
    >
      {label || String(level ?? '—').replace(/_/g, ' ')}
    </span>
  );
}
