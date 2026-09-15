import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { iosContinuousCurve } from '@leopard/mobile-core';

/**
 * Standby / online power glyph drawn as a vector path so the capsule never
 * depends on a font that may lack the U+23FB POWER SYMBOL codepoint.
 */
function PowerGlyph({ color, size = 14 }: Readonly<{ color: string; size?: number }>) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 3v9"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.4}
      />
      <Path
        d="M6.9 6.6a8 8 0 1 0 10.2 0"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.4}
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
 * Grab-style duty capsule floating directly over the map.
 *
 * This is the single source of truth for toggling dispatch availability:
 * "BẬT KẾT NỐI" while offline, "ĐANG KẾT NỐI" while online.
 */
export function DriverConnectionCapsule({
  disabled = false,
  isOnline,
  isPending = false,
  onToggle,
}: DriverConnectionCapsuleProps): React.JSX.Element {
  const isBusy = disabled || isPending;

  return (
    <View pointerEvents="box-none" style={styles.wrap} testID="driver-connection-capsule">
      <Pressable
        accessibilityLabel={
          isPending
            ? 'Đang cập nhật trạng thái nhận đơn'
            : isOnline
              ? 'Đang kết nối. Chạm để tạm nghỉ nhận đơn'
              : 'Đang ngoại tuyến. Chạm để bật kết nối nhận đơn'
        }
        accessibilityRole="button"
        accessibilityState={{ busy: isPending, disabled: isBusy, selected: isOnline }}
        disabled={isBusy}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.capsule,
          isOnline ? styles.capsuleOnline : styles.capsuleOffline,
          pressed && !isBusy ? styles.pressed : null,
          isBusy ? styles.capsuleBusy : null,
        ]}
        testID="driver-connection-toggle"
      >
        <View
          style={[
            styles.glyphDisc,
            { backgroundColor: isOnline ? 'rgba(255,255,255,0.22)' : 'rgba(148,163,184,0.28)' },
          ]}
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" testID="driver-connection-spinner" />
          ) : (
            <PowerGlyph color="#FFFFFF" size={14} />
          )}
        </View>
        <Text style={styles.capsuleText}>
          {isOnline ? 'ĐANG KẾT NỐI' : 'BẬT KẾT NỐI'}
        </Text>
      </Pressable>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isOnline ? '#16A34A' : '#DC2626' },
          ]}
        />
        <Text style={styles.statusText}>
          {isOnline ? 'Bạn đang trực tuyến' : 'Bạn đang ngoại tuyến'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  capsule: {
    alignItems: 'center',
    borderRadius: 24,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    height: 46,
    paddingHorizontal: 14,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  capsuleOffline: {
    backgroundColor: '#0B1E42',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  capsuleOnline: {
    backgroundColor: '#16A34A',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  capsuleBusy: {
    opacity: 0.75,
  },
  glyphDisc: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginRight: 8,
    width: 28,
  },
  capsuleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
    ...iosContinuousCurve,
    flexDirection: 'row',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  statusText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
