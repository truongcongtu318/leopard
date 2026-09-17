import React, { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  colors,
  driverPrimitives,
  IconWallet,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type FinanceTabKey = 'earnings' | 'wallet';

export type FinanceBottomBarProps = Readonly<{
  activeTab: FinanceTabKey;
  onNavigate?: (route: string) => void;
}>;

const ACTIVE_COLOR = colors.brand.primary; // #0B2545 Midnight Navy
const INACTIVE_COLOR = driverPrimitives.colors.gray500; // #8E8E93 Apple System Gray

function BarChartTabIcon({ color }: { color: string }) {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Path
        d="M4.5 11.5C4.5 10.67 5.17 10 6 10s1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-7zm6-6.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v13.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V5zm6 7c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v6.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V12z"
        fill={color}
      />
    </Svg>
  );
}

export function FinanceBottomBar({
  activeTab,
  onNavigate,
}: FinanceBottomBarProps) {
  const insets = useContext(SafeAreaInsetsContext);
  // Guarantee a minimum safe clearance (8pt) even on screens without safe area insets (web/preview/older devices)
  const bottomInset = insets?.bottom ? insets.bottom : spacing.xs;

  const tabs = [
    {
      key: 'earnings' as const,
      label: 'Thu nhập',
      route: '/earnings',
      renderIcon: (active: boolean) => (
        <BarChartTabIcon color={active ? ACTIVE_COLOR : INACTIVE_COLOR} />
      ),
    },
    {
      key: 'wallet' as const,
      label: 'Ví',
      route: '/wallet',
      renderIcon: (active: boolean) => (
        <IconWallet
          color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
          filled={active}
          size={22}
        />
      ),
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]} testID="finance-bottom-bar">
      <View style={styles.topBorder} />
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={tab.key}
              onPress={() => onNavigate?.(tab.route)}
              style={({ pressed }) => [
                styles.tabBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.iconWrap}>{tab.renderIcon(isActive)}</View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : null,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.surface,
    width: '100%',
    zIndex: 50,
  },
  topBorder: {
    backgroundColor: colors.neutral.border,
    height: StyleSheet.hairlineWidth || 1,
    width: '100%',
  },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-around',
    paddingBottom: spacing.xxs,
    paddingTop: spacing.xs,
  },
  tabBtn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  tabLabel: {
    ...typeScale.caption2,
    color: INACTIVE_COLOR,
    fontWeight: '500',
    marginTop: spacing.xxs - 1,
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});
