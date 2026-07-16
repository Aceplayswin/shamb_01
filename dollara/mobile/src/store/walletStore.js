import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './auth';

const STORAGE_KEY = 'dollara_wallet_v1';

const DEFAULT_WALLET = {
  main: 0,
  bonus: 0,
  exposure: 0,
  locked: 0,
  available: 0,
  currency: 'INR',
};

function computeAvailable(wallet) {
  const main = Number(wallet.main) || 0;
  const bonus = Number(wallet.bonus) || 0;
  const locked = Number(wallet.locked) || 0;
  const exposure = Number(wallet.exposure) || 0;
  return Math.max(0, main + bonus - locked - exposure);
}

function normalizeWallet(wallet) {
  const w = { ...DEFAULT_WALLET, ...wallet };
  w.available = computeAvailable(w);
  return w;
}

function mapTransaction(tx) {
  return {
    id: tx.id,
    type: tx.type === 'withdrawal' ? 'withdraw' : tx.type,
    amount: tx.amount,
    status: tx.status,
    method: tx.payment_method,
    created_at: tx.created_at,
  };
}

export const useWalletStore = create((set, get) => ({
  wallet: null,
  transactions: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          wallet: data.wallet ? normalizeWallet(data.wallet) : null,
          transactions: data.transactions ?? [],
        });
      }
    } catch {
      // ignore
    }
    set({ isHydrated: true });
  },

  persist: async () => {
    const { wallet, transactions } = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ wallet, transactions }));
  },

  loadFromApi: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const [wallet, txs] = await Promise.all([
        api('/api/v1/wallet'),
        api('/api/v1/wallet/transactions'),
      ]);
      const transactions = (txs ?? []).map(mapTransaction);
      set({ wallet: normalizeWallet(wallet), transactions });
      await get().persist();
    } catch {
      // keep cached state
    }
  },

  initWallet: async () => {
    await get().loadFromApi();
  },

  reset: async () => {
    set({ wallet: null, transactions: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  deposit: async (amount, method) => {
    const num = Number(amount);
    if (!num || num < 100) throw new Error('Minimum deposit is ₹100');

    const res = await api('/api/v1/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount: num, paymentMethod: method }),
    });
    await get().loadFromApi();
    return { transactionId: res.transactionId, status: res.status };
  },

  withdraw: async (amount, method) => {
    const num = Number(amount);
    if (num < 500) throw new Error('Minimum withdrawal is ₹500');

    await api('/api/v1/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount: num, paymentMethod: method }),
    });
    await get().loadFromApi();
    return { status: 'pending' };
  },

  placeBet: async (amount, game) => {
    const num = Number(amount);
    if (num < (game.min_bet ?? 1)) throw new Error(`Minimum bet is ₹${game.min_bet ?? 1}`);

    const res = await api('/api/v1/games/bet', {
      method: 'POST',
      body: JSON.stringify({ gameId: game.id, amount: num }),
    });
    await get().loadFromApi();
    return { betId: res.betId, status: res.status, payout: 0 };
  },

  addExposure: () => {},
}));
