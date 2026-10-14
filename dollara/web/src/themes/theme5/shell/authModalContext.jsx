'use client';

// Shared modal state for theme5's auth popups. The shell provides it; the header
// account button and the /login + /register route pages consume it to open the
// Login / Register modal over the current page. (Same pattern as theme3/theme4.)

import { createContext, useContext } from 'react';

// value: { mode: null | 'login' | 'register', open(mode), close() }
export const Theme5AuthModalContext = createContext({
  mode: null,
  open: () => {},
  close: () => {},
});

export function useAuthModal() {
  return useContext(Theme5AuthModalContext);
}
