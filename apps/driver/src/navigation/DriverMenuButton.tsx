import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import {
  IconMenu,
  colors,
} from '@leopard/mobile-core';

export type DriverMenuButtonProps = Readonly<{
  color?: string;
  onPress: () => void;
  testID?: string;
  variant?: 'glass' | 'ink' | 'plain';
}>;

export function DriverMenuButton({
  color,
  onPress,
  testID = 'driver-menu-button',
  variant = 'glass',
}: DriverMenuButtonProps) {
  const iconColor = color ?? (variant === 'plain' ? colors.neutral.text : colors.neutral.surface);

  return (
    <Pressable
      accessibilityHint="Mở menu thanh bên trái để xem hồ sơ và bật tắt nhận đơn"
      accessibilityLabel="Mở menu điều hướng tài xế"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'glass' ? styles.glass : variant === 'ink' ? styles.ink : styles.plain,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      <IconMenu color={iconColor} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glass: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ink: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  plain: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  pressed: {
    opacity: 0.75,
  },
});
