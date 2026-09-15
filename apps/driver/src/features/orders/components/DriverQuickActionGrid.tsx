import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconOrders,
  IconScaleWeight,
  IconSupport247,
  IconWallet,
  iosContinuousCurve,
} from '@leopard/mobile-core';

export type DriverQuickAction = Readonly<{
  key: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  icon: React.ReactNode;
  testID: string;
}>;

export type DriverQuickActionGridProps = Readonly<{
  onOpenVehicle: () => void;
  onOpenTrips: () => void;
  onOpenWallet: () => void;
  onOpenSettings: () => void;
}>;

/**
 * Grab-style 4-button shortcut row that sits at the top of the idle bottom
 * sheet: vehicle, trips, wallet, settings.
 */
export function DriverQuickActionGrid({
  onOpenSettings,
  onOpenTrips,
  onOpenVehicle,
  onOpenWallet,
}: DriverQuickActionGridProps): React.JSX.Element {
  const actions: readonly DriverQuickAction[] = [
    {
      key: 'vehicle',
      label: 'Xe của tôi',
      accessibilityLabel: 'Thông tin xe vận chuyển',
      onPress: onOpenVehicle,
      icon: <IconScaleWeight color="#0B1E42" size={20} />,
      testID: 'quick-action-vehicle',
    },
    {
      key: 'trips',
      label: 'Chuyến xe',
      accessibilityLabel: 'Lịch sử chuyến xe',
      onPress: onOpenTrips,
      icon: <IconOrders color="#0B1E42" size={20} />,
      testID: 'quick-action-trips',
    },
    {
      key: 'wallet',
      label: 'Ví tài xế',
      accessibilityLabel: 'Ví tài xế',
      onPress: onOpenWallet,
      icon: <IconWallet color="#0B1E42" size={20} />,
      testID: 'quick-action-wallet',
    },
    {
      key: 'settings',
      label: 'Thiết lập',
      accessibilityLabel: 'Thiết lập nhận đơn và hỗ trợ',
      onPress: onOpenSettings,
      icon: <IconSupport247 color="#0B1E42" size={20} />,
      testID: 'quick-action-settings',
    },
  ];

  return (
    <View style={styles.grid} testID="driver-quick-action-grid">
      {actions.map((action) => (
        <Pressable
          accessibilityLabel={action.accessibilityLabel}
          accessibilityRole="button"
          key={action.key}
          onPress={action.onPress}
          style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
          testID={action.testID}
        >
          <View style={styles.circle}>{action.icon}</View>
          <Text numberOfLines={1} style={styles.label}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 25,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 2,
    height: 50,
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    width: 50,
  },
  label: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
