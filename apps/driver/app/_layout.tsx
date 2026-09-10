import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { Component, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { queryClient } from '@leopard/mobile-core';
import { DriverDrawerProvider } from '../src/navigation/DriverDrawerContext';
import { useDriverIdlePing } from '../src/features/orders/useDriverIdlePing';

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
  useDriverIdlePing(true);
  return null;
}

function RootProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <DriverDrawerProvider>
          <DriverIdlePingListener />
          {children}
        </DriverDrawerProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <RootProviders>
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.boundary}>
          <Slot />
        </SafeAreaView>
      </RootProviders>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boundary: {
    flex: 1,
  },
});
