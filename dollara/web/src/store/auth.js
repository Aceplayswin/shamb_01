import { create } from 'zustand';
import { fetchMe } from '@/services/graphql';
import { api } from '@/services/api';

export const useAuthStore = create((set, get) => ({
  token: null,
  userId: null,
  username: null,
  user: null,
  wallet: null,
  isDemo: false,
  isHydrated: false,
  // Set when the backend rejects our token because this account logged in on
  // another device (see services/api.js -> 'auth:session-revoked'). Cleared
  // once the UI has shown it.
  sessionMessage: null,
  setAuth: (data) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
    }
    set({
      token: data.token,
      userId: data.userId ?? null,
      username: data.username ?? null,
      isDemo: data.isDemo ?? false,
      isHydrated: true,
    });
    get().refreshSession();
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({
      token: null,
      userId: null,
      username: null,
      user: null,
      wallet: null,
      isDemo: false,
    });
  },
  clearSessionMessage: () => set({ sessionMessage: null }),
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    set({ token, isHydrated: true });
    if (token) get().refreshSession();
  },
  refreshSession: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const [me, wallet] = await Promise.all([
        fetchMe().catch(() => null),
        api('/api/v1/wallet').catch(() => null),
      ]);
      if (me) {
        set({
          user: me,
          userId: me.id,
          username: me.username,
          wallet: me.wallet ?? wallet,
        });
      } else if (wallet) {
        set({ wallet });
      } else {
        get().logout();
      }
    } catch {
      get().logout();
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-revoked', (event) => {
    useAuthStore.setState({ sessionMessage: event.detail?.message ?? null });
    useAuthStore.getState().logout();
  });
}
