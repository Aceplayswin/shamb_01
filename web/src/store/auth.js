import { create } from 'zustand';
import { fetchMe } from '@/lib/graphql';
import { api } from '@/lib/api';

export const useAuthStore = create((set, get) => ({
  token: null,
  userId: null,
  username: null,
  user: null,
  wallet: null,
  isDemo: false,
  setAuth: (data) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
    }
    set({
      token: data.token,
      userId: data.userId ?? null,
      username: data.username ?? null,
      isDemo: data.isDemo ?? false,
    });
    get().refreshSession();
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({ token: null, userId: null, username: null, user: null, wallet: null, isDemo: false });
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) set({ token });
    }
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
      }
    } catch {
      // ignore
    }
  },
}));
