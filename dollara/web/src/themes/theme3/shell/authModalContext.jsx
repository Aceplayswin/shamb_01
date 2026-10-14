'use client';

// Shared modal state for theme3's split-panel auth popups. The shell provides it;
// the TopNav buttons and the /login + /register route pages consume it to open the
// Login / Register modal over the current page (matching the reference design).

import { createContext, useContext } from 'react';

// value: { mode: null | 'login' | 'register', open(mode), close() }
export const Theme3AuthModalContext = createContext({
  mode: null,
  open: () => {},
  close: () => {},
});

export function useAuthModal() {
  return useContext(Theme3AuthModalContext);
}
