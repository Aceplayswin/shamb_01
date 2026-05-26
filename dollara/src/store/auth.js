import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useWalletStore } from './walletStore';

const USER_KEY = 'dollara_user_v1';

function buildUser({ userId, username, fullName, phone, isDemo }) {
  return {
    id: userId ?? 'local-user',
    username: username ?? 'player',
    full_name: fullName ?? username ?? 'Player',
    phone: phone ?? '—',
    kyc_status: isDemo ? 'verified' : 'pending',
    account_status: 'active',
    currency: 'INR',
    member_since: new Date().toISOString(),
    email: `${username ?? 'player'}@dollara.app`,
    level: isDemo ? 'Gold' : 'Silver',
    total_bets: isDemo ? 248 : 12,
    total_wins: isDemo ? 89 : 4,
    referral_code: `DOL${(username ?? 'play').slice(0, 4).toUpperCase()}99`,
  };
}

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isDemo: false,
  isHydrated: false,

  setAuth: async ({ token, userId, username, fullName, phone, isDemo = false }) => {
    const user = buildUser({ userId, username, fullName, phone, isDemo });
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, isDemo, user });
    await useWalletStore.getState().initWallet({ isDemo });
    await get().refreshSession();
  },

  refreshSession: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (raw) set({ user: JSON.parse(raw) });
      const walletState = useWalletStore.getState();
      if (!walletState.wallet) await walletState.initWallet({ isDemo: get().isDemo });
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
      const isDemo = token?.includes('demo') ?? false;
      set({ token, user, isDemo, isHydrated: true });
      await useWalletStore.getState().hydrate();
      if (token && !useWalletStore.getState().wallet) {
        await useWalletStore.getState().initWallet({ isDemo });
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

// Wallet selector for components that used useAuthStore wallet
export function useWallet() {
  return useWalletStore((s) => s.wallet);
}
