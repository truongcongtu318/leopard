import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { refreshSession, sessionStore } from '@leopard/mobile-core';
import { resolveDriverLogin } from '../src/navigation/driver-session';
import { DriverSplashScreen } from '../src/auth/DriverSplashScreen';

export const DEFAULT_SPLASH_DURATION_MS = 5000;

export interface DriverIndexProps {
  minDurationMs?: number;
}

export default function DriverIndex({
  minDurationMs = process.env.NODE_ENV === 'test' ? 0 : DEFAULT_SPLASH_DURATION_MS,
}: DriverIndexProps = {}) {
  const router = useRouter();
  const destinationRef = useRef<string | null>(null);
  const userRequestedEnterRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateTo = useCallback(
    (targetPath: string) => {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      router.replace(targetPath as any);
    },
    [router],
  );

  useEffect(() => {
    let active = true;
    const startTime = Date.now();

    void (async () => {
      await sessionStore.hydrate();
      if (!active) return;

      let isAuthenticated = Boolean(sessionStore.getAccessToken());
      const hasRefreshToken = (await sessionStore.getRefreshToken()) !== null;
      if (hasRefreshToken && !isAuthenticated) {
        const refreshed = await refreshSession();
        if (refreshed) {
          isAuthenticated = true;
        } else {
          await sessionStore.clearSession();
        }
      }

      if (!active) return;
      const role = sessionStore.getRole();
      const outcome = resolveDriverLogin({ isAuthenticated, role });
      const target = outcome.kind === 'enter' ? '/orders' : '/(public)/login';

      destinationRef.current = target;

      if (userRequestedEnterRef.current) {
        navigateTo(target);
        return;
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDurationMs - elapsed);

      timerRef.current = setTimeout(() => {
        if (active) {
          navigateTo(target);
        }
      }, remaining);
    })();

    return () => {
      active = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [minDurationMs, navigateTo]);

  const handleGetStarted = useCallback(() => {
    if (destinationRef.current) {
      navigateTo(destinationRef.current);
    } else {
      userRequestedEnterRef.current = true;
    }
  }, [navigateTo]);

  return <DriverSplashScreen onGetStarted={handleGetStarted} />;
}


