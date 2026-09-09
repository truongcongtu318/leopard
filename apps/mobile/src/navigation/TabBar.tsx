import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, IconBell, IconClock, IconEarnings, IconOrders, IconUser, IconWallet } from '@leopard/mobile-core';

export type TabBarItem = Readonly<{
  badgeCount?: number;
  hasUnread?: boolean;
  icon?: (active: boolean) => ReactNode;
  id: string;
  label: string;
  route: string;
}>;

export type TabBarProps = Readonly<{
  items: readonly TabBarItem[];
}>;

function TabIconFallback({ active, id }: { active: boolean; id: string }) {
  const iconColor = active ? colors.brand.background : colors.neutral.subtleText;

  switch (id) {
    case 'orders':
      return (
        <View style={styles.iconBox}>
          <IconOrders color={iconColor} size={20} />
        </View>
      );
    case 'notifications':
      return (
        <View style={styles.iconBox}>
          <IconBell color={iconColor} size={20} />
        </View>
      );
    case 'wallet':
      return (
        <View style={styles.iconBox}>
          <IconWallet color={iconColor} size={20} />
        </View>
      );
    case 'earnings':
      return (
        <View style={styles.iconBox}>
          <IconEarnings color={iconColor} size={20} />
        </View>
      );
    case 'history':
      return (
        <View style={styles.iconBox}>
          <IconClock color={iconColor} size={20} />
        </View>
      );
    case 'profile':
      return (
        <View style={styles.iconBox}>
          <IconUser color={iconColor} size={20} />
        </View>
      );
    default:
      return null;
  }
}

export function TabBar({ items }: TabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <View accessibilityRole="tablist" style={styles.container}>
        {items.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.id}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [
                styles.tab,
                isActive ? styles.tabActive : null,
                pressed ? styles.tabPressed : null,
              ]}
            >
              <View style={styles.iconContainer}>
                {item.icon ? (
                  item.icon(isActive)
                ) : (
                  <TabIconFallback active={isActive} id={item.id} />
                )}
                {item.hasUnread || (item.badgeCount && item.badgeCount > 0) ? (
                  <View style={styles.unreadDot} />
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, isActive ? styles.labelActive : null]}
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
  wrapper: {
    backgroundColor: colors.neutral.canvas,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xxs,
  },
  container: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.tabBar,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    padding: spacing.xxs,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.control,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 6,
  },
  tabActive: {
    backgroundColor: colors.brand.softBackground,
  },
  tabPressed: {
    opacity: 0.8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBox: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  symbolIcon: {
    fontSize: 14,
    lineHeight: 16,
  },
  barIconLine: {
    borderRadius: 1,
    height: 2.5,
    marginVertical: 1,
    width: 14,
  },
  unreadDot: {
    backgroundColor: colors.danger.border,
    borderRadius: radius.pill,
    height: 6,
    position: 'absolute',
    right: -3,
    top: -1,
    width: 6,
  },
  label: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.brand.background,
  },
});

