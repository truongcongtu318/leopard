import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  Box,
  Spinner,
  colors,
  driverPrimitives,
  haptic,
  iosContinuousCurve,
  leopardPalette,
  radius,
  typeScale,
} from '@leopard/mobile-core';

/**
 * Standby / online power glyph drawn as a vector path so the capsule never
 * depends on a font that may lack the U+23FB POWER SYMBOL codepoint.
 */
function PowerGlyph({ color, size = 20 }: Readonly<{ color: string; size?: number }>) {
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
 * Apple Floating Dynamic Island / Capsule.
 * Floats above the cockpit sheet with blur/translucent material, hairline border,
 * glowing pulse ring when active, and responsive haptic feedback.
 */
export function DriverConnectionCapsule({
  disabled = false,
  isOnline,
  isPending = false,
  onToggle,
}: DriverConnectionCapsuleProps): React.JSX.Element {
  const isBusy = disabled || isPending;

  // Gentle breathing halo pulse when online
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnline || isBusy) {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.22,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      pulseAnim.setValue(1);
    };
  }, [isOnline, isBusy, pulseAnim]);

  const handlePress = () => {
    if (isBusy) return;
    try {
      haptic.medium();
    } catch {
      // safe fallback
    }
    onToggle();
  };

  return (
    <View style={styles.islandWrapper}>
      {/* Subtle emerald breathing glow halo behind capsule when online */}
      {isOnline && !isBusy ? (
        <Animated.View
          style={[
            styles.haloGlow,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      ) : null}

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
        onPress={handlePress}
        style={({ pressed }) => [
          styles.capsule,
          {
            backgroundColor: isOnline ? 'rgba(11, 37, 69, 0.96)' : 'rgba(11, 37, 69, 0.92)',
            borderColor: isOnline ? '#00B14F' : 'rgba(255, 255, 255, 0.18)',
            borderWidth: isOnline ? 2 : 1,
            paddingHorizontal: isOnline ? 0 : 28,
            width: isOnline ? 52 : undefined,
          },
          pressed && !isBusy ? styles.pressed : null,
          isBusy ? styles.busy : null,
        ]}
        testID="driver-connection-toggle"
      >
        <Box style={styles.glyphDisc}>
          {isPending ? (
            <Spinner color={colors.neutral.surface} size="small" testID="driver-connection-spinner" />
          ) : (
            <PowerGlyph color={isOnline ? '#00B14F' : colors.neutral.surface} size={20} />
          )}
        </Box>
        {isOnline ? null : <Text style={styles.label}>Bật kết nối</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  islandWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloGlow: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 177, 79, 0.22)',
    zIndex: -1,
  },
  capsule: {
    alignItems: 'center',
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
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
    ...typeScale.headline,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.965 }],
  },
});
