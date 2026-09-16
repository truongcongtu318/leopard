import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconHome,
  IconOrders,
  IconUser,
  IconWallet,
  radius,
  spacing,
} from '@leopard/mobile-core';

export type DriverBottomNavigationProps = Readonly<{
  activeTab?: string;
  onSelectTab?: (tabKey: string) => void;
  onNavigate?: (route: string) => void;
}>;

export type DriverNavItem = Readonly<{
  key: string;
  label: string;
  a11yLabel?: string;
  route: string;
  icon: (active: boolean) => React.ReactNode;
}>;

const NAV_ITEMS: readonly DriverNavItem[] = [
  {
    key: 'home',
    label: 'Trang chủ',
    a11yLabel: 'Trang chủ',
    route: '/orders',
    icon: (active) => <IconHome color={active ? '#0B1E42' : '#64748B'} filled={active} size={20} />,
  },
  {
    key: 'board',
    label: 'Đơn',
    a11yLabel: 'Đơn',
    route: '/board',
    icon: (active) => <IconOrders color={active ? '#0B1E42' : '#64748B'} filled={active} size={20} />,
  },
  {
    key: 'earnings',
    label: 'Thu nhập',
    a11yLabel: 'Thu nhập',
    route: '/earnings',
    icon: (active) => <IconWallet color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'profile',
    label: 'Hồ sơ',
    a11yLabel: 'Hồ sơ',
    route: '/profile',
    icon: (active) => <IconUser color={active ? '#0B1E42' : '#64748B'} filled={active} size={20} />,
  },
];

export function DriverBottomNavigation({
  activeTab = 'home',
  onNavigate,
  onSelectTab,
}: DriverBottomNavigationProps) {
  const handlePress = (item: DriverNavItem) => {
    if (onSelectTab) {
      onSelectTab(item.key);
    }
    if (onNavigate && activeTab !== item.key) {
      onNavigate(item.route);
    }
  };

  return (
    <View style={styles.dockWrapper} testID="driver-bottom-navigation">
      <View style={styles.dockContainer}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <Pressable
              accessibilityLabel={item.a11yLabel || item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.key}
              onPress={() => handlePress(item)}
              style={({ pressed }) => [styles.navItem, pressed ? styles.pressed : null]}
            >
              <View style={styles.iconWrap}>{item.icon(isActive)}</View>
              <Text
                numberOfLines={1}
                style={[styles.navLabel, isActive ? styles.navLabelActive : null]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    backgroundColor: '#F8FAFC',
    bottom: 0,
    left: 0,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxs,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  dockContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.tabBar,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    gap: spacing.xxs,
    justifyContent: 'space-around',
    padding: spacing.xxs,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(11, 30, 66, 0.08)' } as object,
    }),
  },
  navItem: {
    alignItems: 'center',
    borderRadius: radius.control,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
  },
  navLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#0B1E42',
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
