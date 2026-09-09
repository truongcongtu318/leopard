import { Slot, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DriverDrawerProvider } from '../../src/features/driver/navigation/DriverDrawerContext';
import { useDriverIdlePing } from '../../src/features/driver/orders/useDriverIdlePing';
import { useProtectedLayout } from '../../src/navigation/role-router';
import { spacing, typography } from '../../src/theme/tokens';
import { TruckLoader } from '../../src/ui/TruckLoader';

export default function DriverLayout() {
  const decision = useProtectedLayout('driver');
  const router = useRouter();
  const redirectTo = decision.kind === 'denied' ? decision.redirectTo : null;

  useDriverIdlePing(decision.kind === 'authorized');

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (decision.kind === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.loaderWrap}>
          <TruckLoader size="md" />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.loadingText}>
          Đang kiểm tra phiên và quyền truy cập.
        </Text>
      </View>
    );
  }

  if (decision.kind === 'denied') return null;

  return (
    <DriverDrawerProvider>
      <View style={styles.flex}>
        <Slot />
      </View>
    </DriverDrawerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  loaderWrap: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: '#64748B',
    textAlign: 'center',
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
});
