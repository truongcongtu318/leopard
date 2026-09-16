import React, { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  colors,
  driverPrimitives,
  iosContinuousCurve,
} from '@leopard/mobile-core';

export type FinanceTabKey = 'earnings' | 'wallet';

export type FinanceBottomBarProps = Readonly<{
  activeTab: FinanceTabKey;
  onNavigate?: (route: string) => void;
}>;

function BarChartTabIcon({ color }: { color: string }) {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Path
        d="M4 10a1.5 1.5 0 0 1 3 0v8a1.5 1.5 0 0 1-3 0v-8zm6.5-5a1.5 1.5 0 0 1 3 0v13a1.5 1.5 0 0 1-3 0V5zm6.5 7a1.5 1.5 0 0 1 3 0v6a1.5 1.5 0 0 1-3 0v-6z"
        fill={color}
      />
    </Svg>
  );
}

function WalletTabIcon({ color }: { color: string }) {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Path
        d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.99 1-1.72V9c0-.73-.41-1.37-1-1.72zM20 9v6h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3zM5 5h14v2H5V5zm0 14V9h10v1H9c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h6v1H5v2z"
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
  const bottomInset = Math.max(insets?.bottom ?? 0, 10);

  const tabs = [
    {
      key: 'earnings' as const,
      label: 'Thu nhập',
      route: '/earnings',
      renderIcon: (active: boolean) => (
        <BarChartTabIcon color={active ? '#00B14F' : '#8E8E93'} />
      ),
    },
    {
      key: 'wallet' as const,
      label: 'Ví',
      route: '/wallet',
      renderIcon: (active: boolean) => (
        <WalletTabIcon color={active ? '#00B14F' : '#8E8E93'} />
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
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
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
    paddingTop: 4,
  },
  tabBtn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    minHeight: 44,
  },
  iconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  tabLabel: {
    color: '#8E8E93',
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#00B14F',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
