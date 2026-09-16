import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { driverPrimitives, IconRadarPulse, IconSettings, iosContinuousCurve } from '@leopard/mobile-core';

/** Crosshair "locate me" glyph, drawn as a vector (no font dependency). */
function RecenterGlyph({ color, size = 18 }: Readonly<{ color: string; size?: number }>) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={12} cy={12} fill="none" r={6.5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} fill={color} r={2.2} />
      <Path d="M12 2v3.5M12 18.5v3.5M2 12h3.5M18.5 12h3.5" stroke={color} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

export type DriverMapControlStackProps = Readonly<{
  isLocating?: boolean;
  onRecenter: () => void;
  onOpenRadiusSettings: () => void;
  onRefreshOffers?: () => void;
}>;

/**
 * Grab-style vertical control stack floating on the right edge of the map.
 */
export function DriverMapControlStack({
  isLocating = false,
  onOpenRadiusSettings,
  onRecenter,
  onRefreshOffers,
}: DriverMapControlStackProps): React.JSX.Element {
  return (
    <View style={styles.stack} testID="driver-map-control-stack">
      <Pressable
        accessibilityLabel={
          isLocating ? 'Đang xác định vị trí của bạn' : 'Về vị trí hiện tại của tôi'
        }
        accessibilityRole="button"
        accessibilityState={{ busy: isLocating }}
        onPress={onRecenter}
        style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
        testID="driver-map-recenter"
      >
        <RecenterGlyph color={isLocating ? driverPrimitives.colors.gray400 : driverPrimitives.colors.gray900} />
      </Pressable>

      {onRefreshOffers ? (
        <Pressable
          accessibilityLabel="Làm mới danh sách đơn"
          accessibilityRole="button"
          onPress={onRefreshOffers}
          style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
          testID="driver-map-refresh"
        >
          <IconRadarPulse color={driverPrimitives.colors.gray900} size={19} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Thiết lập bán kính nhận đơn"
        accessibilityRole="button"
        onPress={onOpenRadiusSettings}
        style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
        testID="driver-map-radius"
      >
        <IconSettings color={driverPrimitives.colors.gray900} size={19} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
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
