import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, leopardElevation, leopardPalette, leopardRadius, spacing } from '../theme/tokens';
import { IconClock, IconEarnings, IconHome, IconOrders, IconSpeedTruck, IconUser, IconWallet } from './icons/CoreIcons';

export type TabKey = 'home' | 'orders' | 'wallet' | 'account';

export type NavItem = Readonly<{
  key: string;
  label: string;
  badge?: number;
  icon?: (active: boolean) => React.ReactNode;
}>;

export type FloatingNavBarProps = Readonly<{
  activeTab: string;
  onTabChange: ((key: TabKey) => void) | ((key: string) => void);
  items?: readonly NavItem[];
  /** Override active-state icon/label colour. Default: leopardPalette.primary (navy). */
  accentColor?: string;
  /** Override active-state tab background. Default: leopardPalette.primaryBg. */
  accentBg?: string;
}>;

const defaultNavItems: readonly NavItem[] = [
  { key: 'home', label: 'Trang chủ' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'wallet', label: 'Ví' },
  { key: 'account', label: 'Tài khoản' },
];

function renderDefaultNavIcon(key: string, isActive: boolean, accentColor: string) {
  const color = isActive ? accentColor : leopardPalette.textMutedSlate;
  switch (key) {
    case 'home':
      return <IconHome color={color} size={22} />;
    case 'orders':
      return <IconOrders color={color} size={22} />;
    case 'wallet':
      return <IconWallet color={color} size={22} />;
    case 'account':
      return <IconUser color={color} size={22} />;
    default:
      return null;
  }
}

function FloatingNavBarComponent({ activeTab, onTabChange, items, accentColor, accentBg }: FloatingNavBarProps) {
  const navItems = items ?? defaultNavItems;
  const resolvedAccentColor = accentColor ?? leopardPalette.primary;
  const resolvedAccentBg = accentBg ?? leopardPalette.primaryBg;

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
              onPress={() => (onTabChange as (k: any) => void)(item.key)}
              style={({ pressed }) => [
                styles.tabItem,
                isActive ? { backgroundColor: resolvedAccentBg } : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.iconWrap}>
                {item.icon
                  ? item.icon(isActive)
                  : renderDefaultNavIcon(item.key, isActive, resolvedAccentColor)}
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive ? { color: resolvedAccentColor, fontWeight: '600' } : null]}>
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
    minHeight: 44,
    minWidth: 44,
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

