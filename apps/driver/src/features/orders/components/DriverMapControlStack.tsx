import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  VStack,
  colors,
  driverPrimitives,
  haptic,
  iconSize,
  IconRadarPulse,
  IconSettings,
  iosContinuousCurve,
  radius,
  spacing,
} from '@leopard/mobile-core';

/** Crosshair "locate me" glyph, drawn as a vector (no font dependency). */
const RecenterGlyph = memo(function RecenterGlyph({
  color,
  size = iconSize.md,
}: Readonly<{ color: string; size?: number }>) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={12} cy={12} fill="none" r={6.5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} fill={color} r={2.2} />
      <Path d="M12 2v3.5M12 18.5v3.5M2 12h3.5M18.5 12h3.5" stroke={color} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
});

export type DriverMapControlStackProps = Readonly<{
  isLocating?: boolean;
  onRecenter: () => void;
  onOpenRadiusSettings: () => void;
  onRefreshOffers?: () => void;
}>;

/**
 * Grab-style vertical control stack floating on the right edge of the map.
 */
export const DriverMapControlStack = memo(function DriverMapControlStack({
  isLocating = false,
  onOpenRadiusSettings,
  onRecenter,
  onRefreshOffers,
}: DriverMapControlStackProps): React.JSX.Element {
  const handleRecenter = useCallback(() => {
    haptic.selection();
    onRecenter();
  }, [onRecenter]);

  const handleRefresh = useCallback(() => {
    haptic.light();
    onRefreshOffers?.();
  }, [onRefreshOffers]);

  const handleOpenSettings = useCallback(() => {
    haptic.selection();
    onOpenRadiusSettings();
  }, [onOpenRadiusSettings]);

  // ponytail: Vector buttons sized 46x46pt satisfy Apple HIG minimum touch target without extra padding container.
  return (
    <VStack space="xs" style={styles.stack} testID="driver-map-control-stack">
      <Pressable
        accessibilityLabel={
          isLocating ? 'Đang xác định vị trí của bạn' : 'Về vị trí hiện tại của tôi'
        }
        accessibilityRole="button"
        accessibilityState={{ busy: isLocating }}
        onPress={handleRecenter}
        style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
        testID="driver-map-recenter"
      >
        <RecenterGlyph
          color={isLocating ? colors.neutral.subtleText : colors.neutral.text}
          size={iconSize.md}
        />
      </Pressable>

      {onRefreshOffers ? (
        <Pressable
          accessibilityLabel="Làm mới danh sách đơn"
          accessibilityRole="button"
          onPress={handleRefresh}
          style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
          testID="driver-map-refresh"
        >
          <IconRadarPulse color={colors.neutral.text} size={iconSize.md} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Thiết lập bán kính nhận đơn"
        accessibilityRole="button"
        onPress={handleOpenSettings}
        style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
        testID="driver-map-radius"
      >
        <IconSettings color={colors.neutral.text} size={iconSize.md} />
      </Pressable>
    </VStack>
  );
});

const styles = StyleSheet.create({
  stack: {
    gap: spacing.xs,
  },
  btn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
    ...driverPrimitives.shadows.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
