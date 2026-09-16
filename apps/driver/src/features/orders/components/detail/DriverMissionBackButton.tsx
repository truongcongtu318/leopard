import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { IconChevronLeft, driverPrimitives, iosContinuousCurve } from '@leopard/mobile-core';

export type DriverMissionBackButtonProps = Readonly<{
  onBack?: () => void;
}>;

export function DriverMissionBackButton({ onBack }: DriverMissionBackButtonProps) {
  if (!onBack) return null;

  return (
    <Pressable
      accessibilityLabel="Quay lại"
      accessibilityRole="button"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={onBack}
      style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
      testID="driver-mission-back-btn"
    >
      <IconChevronLeft color={driverPrimitives.colors.gray900} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 9999,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...driverPrimitives.shadows.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
