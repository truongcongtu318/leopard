import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import React, { Component, memo, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, queryClient, refreshSession, sessionStore, spacing, typeScale } from '@leopard/mobile-core';
import { DriverViewportShell } from '../src/navigation/DriverViewportShell';
import { useDriverIdlePing } from '../src/features/orders/useDriverIdlePing';
import { DriverDispatchProvider } from '../src/features/orders/DriverDispatchContext';

type RootErrorBoundaryState = {
  hasError: boolean;
};

class RootErrorBoundary extends Component<PropsWithChildren, RootErrorBoundaryState> {
  public state: RootErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): RootErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.boundary}>
          <Text accessibilityRole="alert" style={styles.boundaryText}>
            Ứng dụng tài xế chưa thể khởi động.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Isolated headless listener for background driver availability pinging.
 * Isolated to prevent its state changes from causing parent tree re-renders.
 */
function DriverIdlePingListener() {
  const isMountedRef = useRef(true);
  const [isAuthenticatedDriver, setIsAuthenticatedDriver] = useState(
    () => sessionStore.isAuthenticated() && sessionStore.getRole() === 'DRIVER',
  );

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribe = sessionStore.subscribe((state) => {
      if (isMountedRef.current) {
        setIsAuthenticatedDriver(state.authenticated && state.role === 'DRIVER');
      }
    });
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  useDriverIdlePing(isAuthenticatedDriver);
  return null;
}

const RootProviders = memo(function RootProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <DriverViewportShell>
          <DriverIdlePingListener />
          <DriverDispatchProvider>
            {children}
          </DriverDispatchProvider>
        </DriverViewportShell>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
});

// ponytail: Headless ping listener and dispatch provider embedded in root layout; upgrade to background task service when standalone native background fetch is wired.
export default function RootLayout() {
  const [, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      try {
        await sessionStore.hydrate();
        const hasRefreshToken = (await sessionStore.getRefreshToken()) !== null;
        if (hasRefreshToken && !sessionStore.getAccessToken()) {
          const refreshed = await refreshSession();
          if (!refreshed) {
            await sessionStore.clearSession();
          }
        }
      } catch {
        await sessionStore.clearSession();
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    void initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RootErrorBoundary>
      <RootProviders>
        <Slot />
      </RootProviders>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boundary: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  boundaryText: {
    color: colors.neutral.text,
    ...typeScale.headline,
    textAlign: 'center',
  },
});
