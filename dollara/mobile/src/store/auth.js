import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { fetchMe } from '../services/api';
import { useWalletStore } from './walletStore';

const USER_KEY = 'dollara_user_v1';

function isDemoToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.type === 'demo';
  } catch {
    return false;
  }
}

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isDemo: false,
  isHydrated: false,

  setAuth: async ({ token, userId, username, isDemo = false }) => {
    await AsyncStorage.setItem('token', token);
    set({ token, isDemo: isDemo || isDemoToken(token), userId, username });
    await get().refreshSession();
  },

  refreshSession: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const me = await fetchMe();
      if (me) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
        set({
          user: me,
          isDemo: isDemoToken(token) || me.username?.startsWith('DEMO_'),
        });
      }
      await useWalletStore.getState().loadFromApi();
    } catch {
      // keep existing state
    }
  },

  updateProfile: async (patch) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, ...patch };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    set({ user: updated });
  },

  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem(USER_KEY),
      ]);
      const user = userRaw ? JSON.parse(userRaw) : null;
      const isDemo = token ? isDemoToken(token) : false;
      set({ token, user, isDemo, isHydrated: true });
      if (token) {
        await get().refreshSession();
      } else {
        await useWalletStore.getState().hydrate();
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['token', USER_KEY]);
    await useWalletStore.getState().reset();
    set({ token: null, user: null, isDemo: false });
  },
}));

export function useWallet() {
  return useWalletStore((s) => s.wallet);
}
