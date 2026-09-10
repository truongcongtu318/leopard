import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, leopardRadius, radius, spacing } from '../theme/tokens';
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
  onTabChange?: ((key: TabKey) => void) | ((key: string) => void);
  onSelectTab?: ((key: TabKey) => void) | ((key: string) => void);
  items?: readonly NavItem[];
  /** Override active-state icon/label colour. Default: colors.brand.primary. */
  accentColor?: string;
  /** Override active-state tab background. Default: rgba(11, 30, 66, 0.08). */
  accentBg?: string;
}>;

const defaultNavItems: readonly NavItem[] = [
  { key: 'home', label: 'Trang chủ' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'wallet', label: 'Ví' },
  { key: 'account', label: 'Tài khoản' },
];

function renderDefaultNavIcon(key: string, isActive: boolean, accentColor: string) {
  const color = isActive ? accentColor : '#64748B';
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

function FloatingNavBarComponent({
  activeTab,
  onTabChange,
  onSelectTab,
  items,
  accentColor,
  accentBg,
}: FloatingNavBarProps) {
  const navItems = items ?? defaultNavItems;
  const handleSelect = onSelectTab ?? onTabChange;
  const resolvedAccentColor = accentColor ?? colors.brand.primary;
  const resolvedAccentBg = accentBg ?? 'rgba(11, 30, 66, 0.08)';

  return (
    <View testID="floating-nav-bar" style={styles.floatingContainer}>
      {navItems.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={item.key}
            onPress={() => (handleSelect as ((k: any) => void) | undefined)?.(item.key)}
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
  );
}

export const FloatingNavBar = React.memo(FloatingNavBarComponent);

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: Platform.OS === 'ios' ? 24 : spacing.md,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    zIndex: 100,
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
    borderRadius: radius.pill,
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
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.8,
  },
});

