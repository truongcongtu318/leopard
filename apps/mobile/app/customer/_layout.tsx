import { Slot, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useNotificationsBootstrap } from '../../src/features/customer/notifications/useNotificationsBootstrap';
import { useActiveOrdersCount } from '../../src/features/customer/orders/hooks/useActiveOrdersCount';
import { useProtectedLayout } from '../../src/navigation/role-router';
import { useTabBarHidden } from '../../src/navigation/tabBarVisibilityStore';
import { colors, spacing, typography, customerPalette, FloatingNavBar, type NavItem, type TabKey, TruckLoader } from '@leopard/mobile-core';

export default function CustomerLayout() {
  const decision = useProtectedLayout('customer');
  const router = useRouter();
  const pathname = usePathname();
  const isBookingFlowTabBarHidden = useTabBarHidden();
  const redirectTo = decision.kind === 'denied' ? decision.redirectTo : null;

  useNotificationsBootstrap(decision.kind === 'authorized');

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  const activeOrdersCount = useActiveOrdersCount(decision.kind === 'authorized');

  const navItems: readonly NavItem[] = useMemo(
    () => [
      { key: 'home', label: 'Trang chủ' },
      {
        key: 'orders',
        label: 'Đơn hàng',
        badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      },
      { key: 'wallet', label: 'Ví' },
      { key: 'account', label: 'Tài khoản' },
    ],
    [activeOrdersCount],
  );

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

  const normalizedPath = (pathname || '').toLowerCase();

  const getActiveTab = (): TabKey => {
    if (
      normalizedPath.includes('orders/checkout') ||
      normalizedPath.includes('orders/searching')
    ) {
      return 'home';
    }
    if (
      normalizedPath.includes('orders') ||
      normalizedPath.includes('deliveries') ||
      normalizedPath.includes('tracking')
    ) {
      return 'orders';
    }
    if (normalizedPath.includes('wallet')) {
      return 'wallet';
    }
    if (
      normalizedPath.includes('profile') ||
      normalizedPath.includes('settings') ||
      normalizedPath.includes('addresses') ||
      normalizedPath.includes('promotions')
    ) {
      return 'account';
    }
    return 'home';
  };

  const handleTabChange = (key: TabKey) => {
    switch (key) {
      case 'home':
        router.replace('/customer/home');
        break;
      case 'orders':
        router.replace('/customer/orders');
        break;
      case 'wallet':
        router.replace('/customer/wallet');
        break;
      case 'account':
        router.replace('/customer/profile');
        break;
    }
  };

  const isSubScreenWithoutNav =
    normalizedPath.includes('booking') ||
    normalizedPath.includes('orders/checkout') ||
    normalizedPath.includes('orders/searching') ||
    /\/(?:customer\/)?orders\/[^/]+$/.test(normalizedPath) ||
    normalizedPath.includes('profile-edit') ||
    normalizedPath.includes('chat') ||
    normalizedPath.includes('report') ||
    normalizedPath.includes('review') ||
    normalizedPath.includes('tracking') ||
    normalizedPath.includes('invoice-preview');

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        <Slot />
      </View>
      {!isSubScreenWithoutNav && !isBookingFlowTabBarHidden ? (
        <FloatingNavBar
          accentBg={customerPalette.tabActiveBg}
          accentColor={customerPalette.tabActive}
          activeTab={getActiveTab()}
          items={navItems}
          onTabChange={handleTabChange}
        />
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
    color: colors.neutral.subtleText,
    textAlign: 'center',
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
});


