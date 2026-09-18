import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Box,
  Card,
  HStack,
  driverPrimitives,
  iconSize,
  IconLocationPin,
  IconSpeedTruck,
  IconWallet,
  IconWarningShield,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
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
  onOpenOrderList: () => void;
  onTriggerSos: () => void;
  onOpenWallet: () => void;
  onOpenSettings: () => void;
}>;

/**
 * Clean Grab-style 4-button shortcut row with unified brand palette.
 */
export function DriverQuickActionGrid({
  onOpenOrderList,
  onOpenSettings,
  onOpenWallet,
  onTriggerSos,
}: DriverQuickActionGridProps): React.JSX.Element {
  const actions: readonly DriverQuickAction[] = [
    {
      key: 'order-list',
      label: 'Đơn',
      accessibilityLabel: 'Danh sách đơn hàng',
      onPress: onOpenOrderList,
      icon: (
        <IconSpeedTruck
          color={leopardPalette.primary}
          secondaryColor="#F0F4F9"
          size={22}
          strokeWidth={1.75}
        />
      ),
      testID: 'quick-action-order-list',
    },
    {
      key: 'sos',
      label: 'SOS khẩn cấp',
      accessibilityLabel: 'Gọi cứu hộ khẩn cấp SOS',
      onPress: onTriggerSos,
      icon: (
        <IconWarningShield
          color={leopardPalette.primary}
          secondaryColor="#F0F4F9"
          size={22}
          strokeWidth={1.75}
        />
      ),
      testID: 'quick-action-sos',
    },
    {
      key: 'wallet',
      label: 'Ví tài xế',
      accessibilityLabel: 'Ví tài xế',
      onPress: onOpenWallet,
      icon: (
        <IconWallet
          color={leopardPalette.primary}
          secondaryColor="#FFFFFF"
          size={22}
          strokeWidth={1.75}
        />
      ),
      testID: 'quick-action-wallet',
    },
    {
      key: 'settings',
      label: 'Bán kính',
      accessibilityLabel: 'Thiết lập bán kính nhận đơn',
      onPress: onOpenSettings,
      icon: (
        <IconLocationPin
          color={leopardPalette.primary}
          secondaryColor="#F0F4F9"
          size={22}
          strokeWidth={1.75}
        />
      ),
      testID: 'quick-action-settings',
    },
  ];

  return (
    <Card style={styles.grid} testID="driver-quick-action-grid">
      <HStack style={styles.innerRow}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            key={action.key}
            onPress={action.onPress}
            style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
            testID={action.testID}
          >
            <Box style={styles.circle}>{action.icon}</Box>
            <Text numberOfLines={1} style={styles.label}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </HStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  innerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: 'rgba(11, 37, 69, 0.06)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 48,
  },
  label: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.caption1,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
