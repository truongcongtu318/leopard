import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  IconBell,
  IconClock,
  IconEarnings,
  IconHome,
  IconOrders,
  IconUser,
  IconWallet,
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

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
  const iconColor = active ? customerPalette.primary : '#64748B';

  switch (id) {
    case 'home':
      return (
        <View style={styles.iconBox}>
          <IconHome color={iconColor} filled={active} size={20} />
        </View>
      );
    case 'orders':
      return (
        <View style={styles.iconBox}>
          <IconOrders color={iconColor} filled={active} size={20} />
        </View>
      );
    case 'notifications':
      return (
        <View style={styles.iconBox}>
          <IconBell color={iconColor} filled={active} size={20} />
        </View>
      );
    case 'wallet':
      return (
        <View style={styles.iconBox}>
          <IconWallet color={iconColor} filled={active} size={20} />
        </View>
      );
    case 'earnings':
      return (
        <View style={styles.iconBox}>
          <IconEarnings color={iconColor} filled={active} size={20} />
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
          <IconUser color={iconColor} filled={active} size={20} />
        </View>
      );
    default:
      return null;
  }
}

// Spring physics config per Apple HIG (duration: 300ms perceived, snappy settle)
const TAB_SPRING_CONFIG = {
  damping: 22,
  stiffness: 240,
  mass: 0.8,
};

export function TabBar({ items }: TabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndexShared = useSharedValue(0);
  const containerWidthShared = useSharedValue(0);

  const activeIndex = useMemo(() => {
    const idx = items.findIndex(
      (item) => pathname === item.route || pathname.startsWith(`${item.route}/`),
    );
    return idx >= 0 ? idx : 0;
  }, [items, pathname]);

  useEffect(() => {
    activeIndexShared.value = withSpring(activeIndex, TAB_SPRING_CONFIG);
  }, [activeIndex, activeIndexShared]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth(w);
    containerWidthShared.value = w;
  };

  const numItems = items.length;
  const paddingH = spacing.xxs;

  const animatedPillStyle = useAnimatedStyle(() => {
    if (numItems === 0 || containerWidthShared.value === 0) {
      return { opacity: 0 };
    }
    const innerWidth = containerWidthShared.value - paddingH * 2;
    const tabWidth = innerWidth / numItems;
    const translateX = paddingH + activeIndexShared.value * tabWidth;

    return {
      opacity: 1,
      width: tabWidth,
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.wrapper}>
      <View
        accessibilityRole="tablist"
        onLayout={handleLayout}
        style={styles.container}
        testID="tab-bar-capsule"
      >
        {/* Apple Floating Capsule Glass: Animated Active Tab Pill running on UI Thread */}
        {containerWidth > 0 && numItems > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.activePillIndicator, animatedPillStyle]}
            testID="tab-bar-active-pill"
          />
        ) : null}

        {items.map((item, index) => {
          const isActive = activeIndex === index;

          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.id}
              onPress={() => {
                haptic.selection();
                if (typeof router.push === 'function') {
                  router.push(item.route);
                } else if (typeof router.replace === 'function') {
                  router.replace(item.route);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
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
                  <View style={styles.unreadDot} testID="tab-unread-dot" />
                ) : null}
              </View>
              <Text
                maxFontSizeMultiplier={1.2}
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
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    paddingTop: spacing.xxs,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },

  // ── Apple Floating Capsule Glass ──────────────────────────────────
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    height: 62,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    padding: spacing.xxs,
    position: 'relative',
    overflow: 'hidden',

    // Multi-layer Apple glass shadow
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      } as any,
    }),
  },

  // UI-thread animated sliding capsule indicator
  activePillIndicator: {
    position: 'absolute',
    top: spacing.xxs,
    bottom: spacing.xxs,
    left: 0,
    backgroundColor: customerPalette.tabActiveBg,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 37, 69, 0.08)',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    gap: spacing.hairline,
    zIndex: 2,
  },
  tabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 22,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.danger.border,
  },
  label: {
    ...typeScale.caption2,
    color: '#64748B',
    fontVariant: ['tabular-nums'],
  },
  labelActive: {
    color: customerPalette.primary,
    fontWeight: '600',
  },
});
