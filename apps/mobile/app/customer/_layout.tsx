import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useNotificationsBootstrap } from '../../src/features/customer/notifications/useNotificationsBootstrap';
import { useProtectedLayout } from '../../src/navigation/role-router';
import { spacing, typography } from '../../src/theme/tokens';
import { FloatingNavBar, type TabKey } from '../../src/ui/FloatingNavBar';
import { TruckLoader } from '../../src/ui/TruckLoader';

export default function CustomerLayout() {
  const decision = useProtectedLayout('customer');
  const router = useRouter();
  const pathname = usePathname();
  const redirectTo = decision.kind === 'denied' ? decision.redirectTo : null;

  useNotificationsBootstrap(decision.kind === 'authorized');

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

  const getActiveTab = (): TabKey => {
    if (
      pathname.includes('/customer/orders') ||
      pathname.includes('/customer/deliveries') ||
      pathname.includes('/customer/tracking')
    ) {
      return 'orders';
    }
    if (pathname.includes('/customer/wallet')) {
      return 'wallet';
    }
    if (
      pathname.includes('/customer/profile') ||
      pathname.includes('/customer/settings') ||
      pathname.includes('/customer/addresses') ||
      pathname.includes('/customer/promotions')
    ) {
      return 'account';
    }
    return 'home';
  };

  const handleTabChange = (key: TabKey) => {
    switch (key) {
      case 'home':
        router.push('/customer/home');
        break;
      case 'orders':
        router.push('/customer/orders');
        break;
      case 'wallet':
        router.push('/customer/wallet');
        break;
      case 'account':
        router.push('/customer/profile');
        break;
    }
  };

  const isSubScreenWithoutNav =
    pathname.includes('/customer/chat') ||
    pathname.includes('/customer/report') ||
    pathname.includes('/customer/review') ||
    pathname.includes('/customer/tracking') ||
    pathname.includes('/customer/invoice-preview');

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        <Slot />
      </View>
      {!isSubScreenWithoutNav ? (
        <FloatingNavBar activeTab={getActiveTab()} onTabChange={handleTabChange} />
      ) : null}
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


