import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, leopardElevation, leopardPalette, leopardRadius, spacing } from '../theme/tokens';
import { IconHome, IconOrders, IconRoute, IconUser } from './icons/CoreIcons';

export type TabKey = 'home' | 'orders' | 'tracking' | 'account';

export type NavItem = Readonly<{
  key: TabKey;
  label: string;
  badge?: number;
}>;

export type FloatingNavBarProps = Readonly<{
  activeTab: TabKey;
  onTabChange: (key: TabKey) => void;
}>;

const navItems: readonly NavItem[] = [
  { key: 'home', label: 'Trang chủ' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'tracking', label: 'Lộ trình', badge: 2 },
  { key: 'account', label: 'Tài khoản' },
];

function renderNavIcon(key: TabKey, isActive: boolean) {
  const color = isActive ? leopardPalette.primary : leopardPalette.textMutedSlate;
  switch (key) {
    case 'home':
      return <IconHome color={color} size={22} />;
    case 'orders':
      return <IconOrders color={color} size={22} />;
    case 'tracking':
      return <IconRoute color={color} size={22} />;
    case 'account':
      return <IconUser color={color} size={22} />;
  }
}

function FloatingNavBarComponent({ activeTab, onTabChange }: FloatingNavBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dock}>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.key}
              onPress={() => onTabChange(item.key)}
              style={({ pressed }) => [
                styles.tabItem,
                isActive ? styles.tabItemActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.iconWrap}>
                {renderNavIcon(item.key, isActive)}
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive ? styles.labelActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const FloatingNavBar = React.memo(FloatingNavBarComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 100,
  },
  dock: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    width: '100%',
    maxWidth: 440,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    ...leopardElevation.modal,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: leopardRadius.md,
  },
  tabItemActive: {
    backgroundColor: leopardPalette.primaryBg,
  },
  iconWrap: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.danger.border,
    borderRadius: leopardRadius.pill,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  label: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: leopardPalette.tabActive,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
