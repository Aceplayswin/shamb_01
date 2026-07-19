import { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import { useDemoLogin } from './useDemoLogin';

/**
 * Sign-in entry point shared by every theme's Login page.
 *
 * The player app only ever signs in players: staff sign in on the web console,
 * which is where the admin surface lives. The mode switch the web login shows is
 * deliberately absent here rather than routing to an /admin screen that has no
 * mobile equivalent.
 */
export function useUnifiedLogin({ onSuccess } = {}) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [identifier, setIdentifier] = useState(''); // phone
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { tryDemo, demoLoading } = useDemoLogin({ onSuccess });

  const submit = async () => {
    if (loading || demoLoading) return;
    if (!identifier.trim() || !password) {
      Alert.alert('Missing details', 'Enter your phone number and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await api('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: identifier.trim(), password }),
      });
      await setAuth({ token: result.token, userId: result.userId, isDemo: false });
      onSuccess?.();
    } catch (err) {
      Alert.alert('Login failed', err?.message ?? 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading,
    demoLoading,
    submit,
    tryDemo,
  };
}
