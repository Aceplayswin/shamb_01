import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';

// Activates a disposable demo session (virtual balance, playable like a real
// account, flagged is_demo on the backend). Shared by the top bar CTA and login.
export function useDemoLogin({ onSuccess } = {}) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [demoLoading, setDemoLoading] = useState(false);
  const busyRef = useRef(false);
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;

  const tryDemo = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setDemoLoading(true);
    try {
      const result = await api('/api/v1/auth/demo', { method: 'POST' });
      await setAuth({
        token: result.token,
        userId: result.demoId,
        username: result.demoId,
        isDemo: true,
      });
      successRef.current?.();
    } catch (err) {
      Alert.alert('Demo failed', err?.message ?? 'Could not start demo session');
    } finally {
      busyRef.current = false;
      setDemoLoading(false);
    }
  }, [setAuth]);

  return { tryDemo, demoLoading };
}
