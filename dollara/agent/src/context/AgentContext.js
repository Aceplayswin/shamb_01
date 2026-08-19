'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { agentApi, clearAgentToken, getAgentToken } from '../services/agentApi';
import { todayIso } from '../lib/format';

/**
 * The panel session.
 *
 * Holds the two things more than one screen needs:
 *
 * 1. The agent's identity — level, balance, exposure, available credit. The
 *    credit strip above the reports and the account menu both read it, and it
 *    has to refresh after a credit transfer, so it cannot live in either.
 *
 * 2. The dashboard date range. The dashboard's own picker owns its state, but
 *    the range the agent last searched carries across to the report screens so
 *    they open on the same period rather than resetting to today.
 */

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState({ from: todayIso(), to: todayIso() });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const identity = await agentApi('/api/v1/agent/me');
      setMe(identity);
      return identity;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAgentToken()) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearAgentToken();
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({
      me,
      loading,
      error,
      refresh,
      logout,
      range,
      setRange,
      rangeQuery: `from=${range.from}&to=${range.to}`,
    }),
    [me, loading, error, refresh, logout, range],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used inside <AgentProvider>');
  return ctx;
}
