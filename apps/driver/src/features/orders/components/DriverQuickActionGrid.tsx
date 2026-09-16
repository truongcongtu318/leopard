import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  driverPrimitives,
  IconLocationPin,
  IconSpeedTruck,
  IconWallet,
  IconWarningShield,
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
  onTriggerSos: () => void;
  onOpenWallet: () => void;
  onOpenSettings: () => void;
}>;

/**
 * Grab-style 4-button shortcut row: vehicle, SOS, wallet, radius settings.
 */
export function DriverQuickActionGrid({
  onOpenSettings,
  onOpenVehicle,
  onOpenWallet,
  onTriggerSos,
}: DriverQuickActionGridProps): React.JSX.Element {
  const actions: readonly DriverQuickAction[] = [
    {
      key: 'vehicle',
      label: 'Xe của tôi',
      accessibilityLabel: 'Thông tin xe vận chuyển',
      onPress: onOpenVehicle,
      icon: <IconSpeedTruck color={driverPrimitives.colors.gray900} size={20} />,
      testID: 'quick-action-vehicle',
    },
    {
      key: 'sos',
      label: 'SOS khẩn cấp',
      accessibilityLabel: 'Gọi cứu hộ khẩn cấp SOS',
      onPress: onTriggerSos,
      icon: <IconWarningShield color={driverPrimitives.colors.red500} size={20} />,
      testID: 'quick-action-sos',
    },
    {
      key: 'wallet',
      label: 'Ví tài xế',
      accessibilityLabel: 'Ví tài xế',
      onPress: onOpenWallet,
      icon: <IconWallet color={driverPrimitives.colors.gray900} size={20} />,
      testID: 'quick-action-wallet',
    },
    {
      key: 'settings',
      label: 'Bán kính',
      accessibilityLabel: 'Thiết lập bán kính nhận đơn',
      onPress: onOpenSettings,
      icon: <IconLocationPin color={driverPrimitives.colors.gray900} size={20} />,
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
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 14,
    ...driverPrimitives.shadows.sm,
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 9999,
    height: 48,
    justifyContent: 'center',
    marginBottom: 6,
    width: 48,
  },
  label: {
    color: driverPrimitives.colors.gray700,
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
