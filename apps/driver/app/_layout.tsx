import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { Component, useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient, sessionStore } from '@leopard/mobile-core';
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
          <Text accessibilityRole="alert">Ứng dụng tài xế chưa thể khởi động.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function DriverIdlePingListener() {
  const [isAuthenticatedDriver, setIsAuthenticatedDriver] = useState(
    () => sessionStore.isAuthenticated() && sessionStore.getRole() === 'DRIVER',
  );

  useEffect(() => {
    return sessionStore.subscribe((state) => {
      setIsAuthenticatedDriver(state.authenticated && state.role === 'DRIVER');
    });
  }, []);

  useDriverIdlePing(isAuthenticatedDriver);
  return null;
}

function RootProviders({ children }: PropsWithChildren) {
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
}

export default function RootLayout() {
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
    flex: 1,
  },
});
