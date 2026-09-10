import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { sessionStore } from '@leopard/mobile-core';
import { resolveDriverLogin } from '../src/navigation/driver-session';
import { DriverSplashScreen } from '../src/auth/DriverSplashScreen';

export default function DriverIndex() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void (async () => {
      await sessionStore.hydrate();
      if (!active) return;
      const isAuthenticated = Boolean(sessionStore.getAccessToken());
      const role = sessionStore.getRole();
      const outcome = resolveDriverLogin({ isAuthenticated, role });
      if (outcome.kind === 'enter') {
        router.replace('/orders');
      } else {
        router.replace('/(public)/login');
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return <DriverSplashScreen />;
}

