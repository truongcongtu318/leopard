import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TabBar } from '../../src/navigation/TabBar';
import { useProtectedLayout } from '../../src/navigation/role-router';

const DRIVER_TABS = [
  { id: 'orders', label: 'Đơn hàng', route: '/driver/orders' },
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
        <Text accessibilityLiveRegion="polite">Đang kiểm tra phiên và quyền truy cập.</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  flex: {
    flex: 1,
  },
});

