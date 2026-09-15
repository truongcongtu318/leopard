import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconEarnings,
  IconHome,
  IconOrders,
  IconUser,
  IconWallet,
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
    icon: (active) => <IconHome color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'orders',
    label: 'Chuyến xe',
    a11yLabel: 'Chuyến xe',
    route: '/history',
    icon: (active) => <IconOrders color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'earnings',
    label: 'Thu nhập',
    a11yLabel: 'Thu nhập',
    route: '/earnings',
    icon: (active) => <IconEarnings color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'wallet',
    label: 'Ví tiền',
    a11yLabel: 'Ví tiền',
    route: '/wallet',
    icon: (active) => <IconWallet color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'profile',
    label: 'Hồ sơ',
    a11yLabel: 'Hồ sơ',
    route: '/profile',
    icon: (active) => <IconUser color={active ? '#0B1E42' : '#64748B'} size={20} />,
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
              style={({ pressed }) => [
                styles.navItem,
                isActive ? styles.navItemActive : null,
                pressed ? styles.pressed : null,
              ]}
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
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  dockContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 72 : 62,
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 14 : 4,
    paddingHorizontal: 4,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(11, 30, 66, 0.06)',
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
