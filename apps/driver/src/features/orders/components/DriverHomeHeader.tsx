import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, IconBell, IconMenu } from '@leopard/mobile-core';

export type DriverHomeHeaderProps = Readonly<{
  driverName?: string | null;
  vehicleLabel?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  availabilityControl?: React.ReactNode;
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
}>;

export function DriverHomeHeader({
  availabilityControl,
  driverName,
  onOpenMenu,
  onOpenNotifications,
  vehicleLabel,
  vehiclePlate,
  vehicleType,
}: DriverHomeHeaderProps) {
  const displayVehicle =
    vehicleLabel ||
    (vehiclePlate
      ? `${vehiclePlate}${vehicleType ? ` (${vehicleType})` : ''}`
      : 'Đang cập nhật phương tiện');

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <Pressable
          accessibilityHint="Mở menu thanh bên trái để xem hồ sơ và các tiện ích"
          accessibilityLabel="Mở menu điều hướng tài xế"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenMenu}
          style={({ pressed }) => [styles.menuBtn, pressed ? styles.pressed : null]}
          testID="driver-menu-button"
        >
          <IconMenu color="#0B1E42" size={20} />
        </Pressable>

        <View style={styles.metaGroup}>
          <Text numberOfLines={1} style={styles.driverGreeting}>
            Chào anh, <Text style={styles.driverName}>{driverName || 'Tài xế LEOPARD'}</Text>
          </Text>
          <Text numberOfLines={1} style={styles.vehiclePlate}>
            {displayVehicle}
          </Text>
        </View>
      </View>

      {availabilityControl ? (
        availabilityControl
      ) : onOpenNotifications ? (
        <Pressable
          accessibilityLabel="Thông báo hệ thống"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenNotifications}
          style={({ pressed }) => [styles.bellBtn, pressed ? styles.pressed : null]}
        >
          <IconBell color="#0B1E42" size={19} />
          <View style={styles.bellDot} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  leftGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 12,
  },
  menuBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: 10,
    width: 44,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  metaGroup: {
    flex: 1,
  },
  driverGreeting: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
  },
  driverName: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '700',
  },
  vehiclePlate: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  bellBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bellDot: {
    backgroundColor: '#F97316',
    borderColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1.5,
    height: 8,
    position: 'absolute',
    right: 10,
    top: 10,
    width: 8,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
