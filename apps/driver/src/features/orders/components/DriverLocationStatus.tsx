import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { iosContinuousCurve } from '@leopard/mobile-core';
import type { DriverLocationState } from '../driver-current-location';

export type DriverLocationStatusProps = Readonly<{
  location: DriverLocationState;
  onRetry: () => void;
}>;

/**
 * Location recovery affordance.
 *
 * The happy path renders nothing: the map already shows the driver's position,
 * and a permanent "Vị trí hiện tại" pill was pure chrome. Only a truly broken
 * state (permission denied / no fix / still locating) surfaces a control.
 */
export function DriverLocationStatus({ location, onRetry }: DriverLocationStatusProps) {
  if (location.kind === 'ready') {
    return null;
  }

  if (location.kind === 'loading') {
    return (
      <View
        accessibilityLabel="Đang xác định vị trí GPS hiện tại"
        style={styles.pill}
        testID="driver-current-location-status"
      >
        <View style={[styles.dot, styles.dotLoading]} />
        <Text style={styles.text}>Đang xác định vị trí...</Text>
      </View>
    );
  }

  const label =
    location.kind === 'permission-denied'
      ? 'Chưa cấp quyền vị trí · Thử lại'
      : 'Không lấy được vị trí · Thử lại';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onRetry}
      style={({ pressed }) => [styles.pill, styles.pillWarning, pressed ? styles.pressed : null]}
      testID="driver-current-location-status"
    >
      <View style={[styles.dot, styles.dotWarning]} />
      <Text style={[styles.text, styles.textWarning]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 999,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    marginTop: 8,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  pillWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  dotLoading: {
    backgroundColor: '#94A3B8',
  },
  dotWarning: {
    backgroundColor: '#D97706',
  },
  text: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
  },
  textWarning: {
    color: '#92400E',
  },
  pressed: {
    opacity: 0.85,
  },
});
