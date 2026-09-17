import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  driverPrimitives,
  IconHome,
  IconOrders,
  IconUser,
  IconWallet,
  iosContinuousCurve,
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
    icon: (active) => (
      <IconHome
        color={active ? colors.brand.primary : driverPrimitives.colors.gray500}
        filled={active}
        size={22}
      />
    ),
  },
  {
    key: 'board',
    label: 'Đơn',
    a11yLabel: 'Đơn',
    route: '/board',
    icon: (active) => (
      <IconOrders
        color={active ? colors.brand.primary : driverPrimitives.colors.gray500}
        filled={active}
        size={22}
      />
    ),
  },
  {
    key: 'earnings',
    label: 'Thu nhập',
    a11yLabel: 'Thu nhập',
    route: '/earnings',
    icon: (active) => (
      <IconWallet
        color={active ? colors.brand.primary : driverPrimitives.colors.gray500}
        filled={active}
        size={22}
      />
    ),
  },
  {
    key: 'profile',
    label: 'Hồ sơ',
    a11yLabel: 'Hồ sơ',
    route: '/profile',
    icon: (active) => (
      <IconUser
        color={active ? colors.brand.primary : driverPrimitives.colors.gray500}
        filled={active}
        size={22}
      />
    ),
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
              <View style={[styles.iconWrap, isActive ? styles.iconWrapActive : null]}>
                {item.icon(isActive)}
              </View>
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
    backgroundColor: 'transparent',
    bottom: 0,
    left: 0,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxs,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  dockContainer: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: driverPrimitives.radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    ...driverPrimitives.shadows.floating,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: radius.control,
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navItemActive: {},
  iconWrap: {
    alignItems: 'center',
    borderRadius: driverPrimitives.radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
  },
  navLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
