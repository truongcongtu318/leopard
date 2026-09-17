import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  colors,
  driverPrimitives,
  iosContinuousCurve,
} from '@leopard/mobile-core';

/**
 * Standby / online power glyph drawn as a vector path so the capsule never
 * depends on a font that may lack the U+23FB POWER SYMBOL codepoint.
 */
function PowerGlyph({ color, size = 18 }: Readonly<{ color: string; size?: number }>) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M12 3v9" fill="none" stroke={color} strokeLinecap="round" strokeWidth={2.5} />
      <Path
        d="M6.9 6.6a8 8 0 1 0 10.2 0"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.5}
      />
    </Svg>
  );
}

export type DriverConnectionCapsuleProps = Readonly<{
  isOnline: boolean;
  isPending?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}>;

/**
 * Grab-style duty pill. Floats directly above the bottom sheet and is the single
 * source of truth for toggling dispatch availability.
 */
export function DriverConnectionCapsule({
  disabled = false,
  isOnline,
  isPending = false,
  onToggle,
}: DriverConnectionCapsuleProps): React.JSX.Element {
  const isBusy = disabled || isPending;

  return (
    <Pressable
      accessibilityLabel={
        isPending
          ? 'Đang cập nhật trạng thái nhận đơn'
          : isOnline
            ? 'Đang nhận cuốc. Chạm để tắt kết nối'
            : 'Đang tắt kết nối. Chạm để bật kết nối nhận đơn'
      }
      accessibilityRole="button"
      accessibilityState={{ busy: isPending, disabled: isBusy, selected: isOnline }}
      disabled={isBusy}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.capsule,
        {
          backgroundColor: colors.brand.primary,
          borderColor: isOnline ? '#00B14F' : 'rgba(255, 255, 255, 0.16)',
          borderWidth: isOnline ? 2 : 1,
          paddingHorizontal: isOnline ? 0 : 28,
          width: isOnline ? 52 : undefined,
        },
        pressed && !isBusy ? styles.pressed : null,
        isBusy ? styles.busy : null,
      ]}
      testID="driver-connection-toggle"
    >
      <View style={styles.glyphDisc}>
        {isPending ? (
          <ActivityIndicator color={colors.neutral.surface} size="small" testID="driver-connection-spinner" />
        ) : (
          <PowerGlyph color={isOnline ? '#00B14F' : colors.neutral.surface} size={20} />
        )}
      </View>
      {isOnline ? null : <Text style={styles.label}>Bật kết nối</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 9999,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    justifyContent: 'center',
    ...driverPrimitives.shadows.powerPill,
  },
  busy: {
    opacity: 0.75,
  },
  glyphDisc: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  label: {
    color: colors.neutral.surface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
