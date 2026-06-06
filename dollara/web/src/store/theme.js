import { create } from 'zustand';

const STORAGE_KEY = 'theme';

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', theme === 'light');
}

export const useThemeStore = create((set, get) => ({
  theme: 'dark',
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark';
    applyTheme(theme);
    set({ theme });
  },
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'light' ? 'dark' : 'light');
  },
}));
