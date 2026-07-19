import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';

// Guard for screens that need a signed-in player. Returns false until the store
// has hydrated (so a logged-in player never flashes the login screen on a cold
// start) and redirects to login once we know there is no session.
export function useRequireAuth(navigation) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (isHydrated && !token) navigation.replace('login');
  }, [isHydrated, token, navigation]);

  return Boolean(isHydrated && token);
}
