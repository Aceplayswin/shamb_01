import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

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

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

  initWallet: async (opts = {}) => {
    const isDemo = opts.isDemo ?? false;
    const wallet = normalizeWallet({
      main: isDemo ? 50000 : 10000,
      bonus: isDemo ? 5000 : 1000,
      exposure: 0,
      locked: 0,
      currency: 'INR',
    });
    const transactions = isDemo
      ? [
          {
            id: makeId('tx'),
            type: 'deposit',
            amount: 50000,
            status: 'completed',
            method: 'upi',
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          },
          {
            id: makeId('tx'),
            type: 'bonus',
            amount: 5000,
            status: 'completed',
            method: 'promo',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
        ]
      : [
          {
            id: makeId('tx'),
            type: 'deposit',
            amount: 10000,
            status: 'completed',
            method: 'upi',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: makeId('tx'),
            type: 'bonus',
            amount: 1000,
            status: 'completed',
            method: 'welcome',
            created_at: new Date(Date.now() - 43200000).toISOString(),
          },
        ];
    set({ wallet, transactions });
    await get().persist();
  },

  reset: async () => {
    set({ wallet: null, transactions: [] });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  deposit: async (amount, method) => {
    const num = Number(amount);
    if (!num || num < 100) throw new Error('Minimum deposit is ₹100');

    const txId = makeId('dep');
    const pendingTx = {
      id: txId,
      type: 'deposit',
      amount: num,
      status: 'pending',
      method,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ transactions: [pendingTx, ...s.transactions] }));
    await get().persist();
    return { transactionId: txId, status: 'pending' };
  },

  confirmDeposit: async (txId) => {
    const { wallet, transactions } = get();
    const tx = transactions.find((t) => t.id === txId);
    if (!tx || tx.status !== 'pending') throw new Error('Transaction not found');

    const bonus = tx.amount >= 1000 ? tx.amount * 0.1 : 0;
    const updatedWallet = normalizeWallet({
      ...wallet,
      main: (wallet?.main ?? 0) + tx.amount,
      bonus: (wallet?.bonus ?? 0) + bonus,
    });

    const updatedTx = transactions.map((t) =>
      t.id === txId ? { ...t, status: 'completed' } : t,
    );
    const bonusTx =
      bonus > 0
        ? {
            id: makeId('tx'),
            type: 'bonus',
            amount: bonus,
            status: 'completed',
            method: 'deposit_bonus',
            created_at: new Date().toISOString(),
          }
        : null;

    set({
      wallet: updatedWallet,
      transactions: bonusTx ? [bonusTx, ...updatedTx] : updatedTx,
    });
    await get().persist();
    return { credited: tx.amount + bonus };
  },

  withdraw: async (amount, method) => {
    const num = Number(amount);
    const { wallet } = get();
    if (!wallet) throw new Error('Wallet not initialized');
    if (num < 500) throw new Error('Minimum withdrawal is ₹500');
    if (num > wallet.available) throw new Error('Insufficient balance');

    const updatedWallet = normalizeWallet({
      ...wallet,
      main: wallet.main - num,
      locked: wallet.locked + num,
    });

    const tx = {
      id: makeId('wd'),
      type: 'withdraw',
      amount: num,
      status: 'processing',
      method,
      created_at: new Date().toISOString(),
    };

    set((s) => ({
      wallet: updatedWallet,
      transactions: [tx, ...s.transactions],
    }));
    await get().persist();

    setTimeout(async () => {
      const state = get();
      const completed = state.transactions.map((t) =>
        t.id === tx.id ? { ...t, status: 'completed' } : t,
      );
      const w = normalizeWallet({
        ...state.wallet,
        locked: Math.max(0, (state.wallet?.locked ?? 0) - num),
      });
      set({ transactions: completed, wallet: w });
      await get().persist();
    }, 2000);

    return { status: 'processing' };
  },

  placeBet: async (amount, game) => {
    const num = Number(amount);
    const { wallet } = get();
    if (!wallet) throw new Error('Wallet not initialized');
    if (num < (game.min_bet ?? 1)) throw new Error(`Minimum bet is ₹${game.min_bet ?? 1}`);
    if (num > wallet.available) throw new Error('Insufficient balance');

    const win = Math.random() > 0.55;
    const payout = win ? num * (1 + Math.random() * 2) : 0;
    const net = payout - num;

    const updatedWallet = normalizeWallet({
      ...wallet,
      main: Math.max(0, wallet.main + net),
      exposure: Math.max(0, wallet.exposure - num),
    });

    const tx = {
      id: makeId('bet'),
      type: win ? 'win' : 'bet',
      amount: win ? payout : num,
      status: 'completed',
      method: game.name,
      gameId: game.id,
      created_at: new Date().toISOString(),
    };

    set((s) => ({
      wallet: updatedWallet,
      transactions: [tx, ...s.transactions],
    }));
    await get().persist();

    return { betId: tx.id, status: win ? 'won' : 'lost', payout };
  },

  addExposure: (amount) => {
    const { wallet } = get();
    if (!wallet) return;
    set({ wallet: normalizeWallet({ ...wallet, exposure: wallet.exposure + amount }) });
    get().persist();
  },
}));
