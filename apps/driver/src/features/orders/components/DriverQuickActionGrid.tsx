import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
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
 * Grab-style 4-button shortcut row that sits at the top of the idle bottom
 * sheet: vehicle, SOS, wallet, settings. Trip history and wallet already have
 * their own destinations (Đơn tab, Hồ sơ menu) — this row only carries
 * shortcuts that are worth a tap directly from the cockpit.
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
      icon: <IconSpeedTruck color="#0B1E42" size={20} />,
      testID: 'quick-action-vehicle',
    },
    {
      key: 'sos',
      label: 'SOS khẩn cấp',
      accessibilityLabel: 'Gọi cứu hộ khẩn cấp SOS',
      onPress: onTriggerSos,
      icon: <IconWarningShield color="#DC2626" size={20} />,
      testID: 'quick-action-sos',
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
      label: 'Bán kính nhận đơn',
      accessibilityLabel: 'Thiết lập bán kính nhận đơn',
      onPress: onOpenSettings,
      icon: <IconLocationPin color="#0B1E42" size={20} />,
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
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.06)',
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 14,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    ...Platform.select({
      web: { boxShadow: '0 6px 14px rgba(11, 30, 66, 0.14)' } as object,
    }),
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    marginBottom: 8,
    width: 50,
  },
  label: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
