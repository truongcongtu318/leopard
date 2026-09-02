import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TabBar } from '../../src/navigation/TabBar';
import { useProtectedLayout } from '../../src/navigation/role-router';
import { spacing, typography } from '../../src/theme/tokens';
import { TruckLoader } from '../../src/ui/TruckLoader';

const DRIVER_TABS = [
  { id: 'orders', label: 'Tổng quan', route: '/driver/orders' },
  { id: 'earnings', label: 'Doanh thu', route: '/driver/earnings' },
  { id: 'history', label: 'Lịch sử', route: '/driver/history' },
  { id: 'profile', label: 'Hồ sơ', route: '/driver/profile' },
] as const;

export default function DriverLayout() {
  const decision = useProtectedLayout('driver');
  const router = useRouter();
  const redirectTo = decision.kind === 'denied' ? decision.redirectTo : null;

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
    <View style={styles.flex}>
      <View style={styles.flex}>
        <Slot />
      </View>
      <TabBar items={DRIVER_TABS} />
    </View>
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


