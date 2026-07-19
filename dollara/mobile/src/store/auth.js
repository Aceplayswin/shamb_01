import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { fetchMe } from '../services/graphql';
import { api } from '../services/api';
import { setToken } from './token';

const TOKEN_KEY = 'token';
const USER_KEY = 'dollara_user_v1';

// Decode the JWT payload without a crypto dependency. Only used to tell a demo
// session apart from a real one for UI copy — never for authorization, which is
// always the server's call.
function isDemoToken(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(global.atob ? global.atob(part) : decodeBase64(part));
    return payload.type === 'demo';
  } catch {
    return false;
  }
}

// Hermes ships atob on newer RN, but fall back so this never throws.
function decodeBase64(input) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const str = input.replace(/=+$/, '');
  for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ) {
    buffer = chars.indexOf(buffer);
    if (~buffer) {
      bs = bc % 4 ? bs * 64 + buffer : buffer;
      if (bc++ % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

export const useAuthStore = create((set, get) => ({
  token: null,
  userId: null,
  username: null,
  user: null,
  wallet: null,
  isDemo: false,
  isHydrated: false,

  setAuth: async (data) => {
    setToken(data.token);
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    set({
      token: data.token,
      userId: data.userId ?? null,
      username: data.username ?? null,
      isDemo: data.isDemo ?? isDemoToken(data.token),
      isHydrated: true,
    });
    await get().refreshSession();
  },

  logout: async () => {
    setToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    set({
      token: null,
      userId: null,
      username: null,
      user: null,
      wallet: null,
      isDemo: false,
    });
  },

  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      setToken(token);
      const cachedUser = userRaw ? JSON.parse(userRaw) : null;
      set({
        token,
        user: cachedUser,
        wallet: cachedUser?.wallet ?? null,
        username: cachedUser?.username ?? null,
        userId: cachedUser?.id ?? null,
        isDemo: token ? isDemoToken(token) : false,
        isHydrated: true,
      });
      if (token) await get().refreshSession();
    } catch {
      set({ isHydrated: true });
    }
  },

  // Pull the authoritative user + wallet. A token the server rejects logs the
  // session out so the app never sits in a half-authenticated state.
  refreshSession: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const [me, wallet] = await Promise.all([
        fetchMe().catch(() => null),
        api('/api/v1/wallet').catch(() => null),
      ]);
      if (me) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
        set({
          user: me,
          userId: me.id,
          username: me.username,
          wallet: me.wallet ?? wallet,
        });
      } else if (wallet) {
        set({ wallet });
      } else {
        await get().logout();
      }
    } catch {
      await get().logout();
    }
  },
}));
