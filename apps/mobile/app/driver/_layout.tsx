import { Slot, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FloatingNavBar } from '../../src/ui/FloatingNavBar';
import type { NavItem } from '../../src/ui/FloatingNavBar';
import { IconClock, IconEarnings, IconOrders, IconUser } from '../../src/ui/icons/CoreIcons';
import { useProtectedLayout } from '../../src/navigation/role-router';
import { leopardPalette, spacing, typography } from '../../src/theme/tokens';
import { TruckLoader } from '../../src/ui/TruckLoader';

const DRIVER_TABS: readonly NavItem[] = [
  {
    key: 'orders',
    label: 'Tổng quan',
    icon: (active: boolean) => (
      <IconOrders color={active ? leopardPalette.primary : leopardPalette.textMutedSlate} size={22} />
    ),
  },
  {
    key: 'earnings',
    label: 'Doanh thu',
    icon: (active: boolean) => (
      <IconEarnings color={active ? leopardPalette.primary : leopardPalette.textMutedSlate} size={22} />
    ),
  },
  {
    key: 'history',
    label: 'Lịch sử',
    icon: (active: boolean) => (
      <IconClock color={active ? leopardPalette.primary : leopardPalette.textMutedSlate} size={22} />
    ),
  },
  {
    key: 'profile',
    label: 'Hồ sơ',
    icon: (active: boolean) => (
      <IconUser color={active ? leopardPalette.primary : leopardPalette.textMutedSlate} size={22} />
    ),
  },
] as const;

const TAB_ROUTE_MAP: Record<string, string> = {
  orders: '/driver/orders',
  earnings: '/driver/earnings',
  history: '/driver/history',
  profile: '/driver/profile',
};

function getActiveTab(pathname: string): string {
  if (pathname.startsWith('/driver/earnings')) return 'earnings';
  if (pathname.startsWith('/driver/history')) return 'history';
  if (pathname.startsWith('/driver/profile')) return 'profile';
  return 'orders';
}

export default function DriverLayout() {
  const decision = useProtectedLayout('driver');
  const router = useRouter();
  const pathname = usePathname();
  const redirectTo = decision.kind === 'denied' ? decision.redirectTo : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  const handleTabChange = useCallback(
    (key: string) => {
      const route = TAB_ROUTE_MAP[key];
      if (route) router.push(route);
    },
    [router],
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

  const activeTab = getActiveTab(pathname);

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        <Slot />
      </View>
      <FloatingNavBar
        activeTab={activeTab}
        items={DRIVER_TABS}
        onTabChange={handleTabChange}
      />
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
