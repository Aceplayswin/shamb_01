'use client';

// App-wide auth-modal state. Login and Register are presented as popups over the
// current page (never a separate page). The provider is mounted once in the root
// layout, ABOVE the theme shell, so its state survives client navigation — e.g.
// the /login and /register routes open the modal and then redirect back to "/".
//
// theme1 + theme2 consume this via the shared <UserAuthActions> buttons and each
// render their own themed <AuthModals>. theme3/4/5 predate this and keep their own
// per-theme modal context (src/themes/themeN/shell/authModalContext.jsx).

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// value: { mode: null | 'login' | 'register', open(mode), close() }
const AuthModalContext = createContext({
  mode: null,
  open: () => {},
  close: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function AuthModalProvider({ children }) {
  const [mode, setMode] = useState(null);

  const open = useCallback((next) => setMode(next), []);
  const close = useCallback(() => setMode(null), []);
  const value = useMemo(() => ({ mode, open, close }), [mode, open, close]);

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}
