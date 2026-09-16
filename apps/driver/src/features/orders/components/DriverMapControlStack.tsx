import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { IconRadarPulse, IconSettings, iosContinuousCurve } from '@leopard/mobile-core';

/** Crosshair "locate me" glyph, drawn as a vector (no font dependency). */
function RecenterGlyph({ color, size = 18 }: Readonly<{ color: string; size?: number }>) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={12} cy={12} fill="none" r={6.5} stroke={color} strokeWidth={1.9} />
      <Circle cx={12} cy={12} fill={color} r={2.1} />
      <Path d="M12 2.2v3.4M12 18.4v3.4M2.2 12h3.4M18.4 12h3.4" stroke={color} strokeLinecap="round" strokeWidth={1.9} />
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
 * Every control performs a real action for the pilot — no decorative buttons.
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
        <RecenterGlyph color={isLocating ? '#94A3B8' : '#0B1E42'} />
      </Pressable>

      {onRefreshOffers ? (
        <Pressable
          accessibilityLabel="Làm mới danh sách đơn"
          accessibilityRole="button"
          onPress={onRefreshOffers}
          style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
          testID="driver-map-refresh"
        >
          <IconRadarPulse color="#0B1E42" size={19} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Thiết lập bán kính nhận đơn"
        accessibilityRole="button"
        onPress={onOpenRadiusSettings}
        style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
        testID="driver-map-radius"
      >
        <IconSettings color="#0B1E42" size={19} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  btn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 22,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 3,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    width: 44,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
