'use client';

import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/theme';

// Compact pill switch for the desktop rail / settings menus.
export function ThemeToggle({ className = '' }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={isLight}
      className={`group flex items-center gap-1 rounded-full border border-hairline/10 bg-panel/60 p-1 transition hover:border-brand-400/40 ${className}`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-full transition ${
          !isLight ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-surface-950 shadow-glow' : 'text-muted'
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
      </span>
      <span
        className={`grid h-7 w-7 place-items-center rounded-full transition ${
          isLight ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-surface-950 shadow-glow' : 'text-muted'
        }`}
      >
        <Sun className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

// Single icon button — used where space is tight (mobile bars, rail items).
export function ThemeToggleButton({ className = '' }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={isLight}
      className={`group grid h-9 w-9 place-items-center rounded-xl border border-transparent text-muted transition hover:border-hairline/10 hover:bg-panel hover:text-app-fg ${className}`}
    >
      {isLight ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}
