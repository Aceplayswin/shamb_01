'use client';

// Shared modal state for theme4's auth popups. The shell provides it; the header
// LOG IN button and the /login + /register route pages consume it to open the
// Login / Register modal over the current page.

import { createContext, useContext } from 'react';

// value: { mode: null | 'login' | 'register', open(mode), close() }
export const Theme4AuthModalContext = createContext({
  mode: null,
  open: () => {},
  close: () => {},
});

export function useAuthModal() {
  return useContext(Theme4AuthModalContext);
}
