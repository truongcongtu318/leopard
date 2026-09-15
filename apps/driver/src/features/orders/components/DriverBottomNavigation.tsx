import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  radius,
  spacing,
  IconEarnings,
  IconHome,
  IconOrders,
  IconUser,
} from '@leopard/mobile-core';

export type DriverBottomNavigationProps = Readonly<{
  activeTab?: string;
  onSelectTab?: (tabKey: string) => void;
  onNavigate?: (route: string) => void;
}>;

export type DriverNavItem = Readonly<{
  key: string;
  label: string;
  route: string;
  icon: (active: boolean) => React.ReactNode;
}>;

const NAV_ITEMS: readonly DriverNavItem[] = [
  {
    key: 'home',
    label: 'Trang chủ',
    route: '/orders',
    icon: (active) => <IconHome color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'orders',
    label: 'Đơn',
    route: '/history',
    icon: (active) => <IconOrders color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'earnings',
    label: 'Thu nhập',
    route: '/earnings',
    icon: (active) => <IconEarnings color={active ? '#0B1E42' : '#64748B'} size={20} />,
  },
  {
    key: 'profile',
    label: 'Tôi',
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
              accessibilityLabel={item.label}
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
              <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>
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
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 50,
  },
  dockContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#E2E8F0',
    borderRadius: 26,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 18,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    backgroundColor: 'rgba(11, 30, 66, 0.07)',
  },
  iconWrap: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
  },
  navLabel: {
    color: '#64748B',
    fontSize: 11,
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
