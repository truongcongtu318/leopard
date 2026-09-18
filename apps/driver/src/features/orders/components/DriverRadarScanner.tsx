import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { leopardPalette, radius } from '@leopard/mobile-core';

export type DriverRadarScannerProps = Readonly<{
  /** Whether the radar is actively pulsing (e.g. driver is online and idle) */
  isActive?: boolean;
  size?: number;
}>;

/**
 * Minimal Luxury Radar Scanner for Driver Cockpit.
 * Designed with Apple HIG elegance: concentric expanding pulse rings with Midnight Navy
 * (#0B2545) and Cheetah Golden Amber (#F59E0B) accents, running 100% on the UI thread.
 */
export function DriverRadarScanner({
  isActive = true,
  size = 280,
}: DriverRadarScannerProps): React.JSX.Element | null {
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      pulseAnim1.setValue(0);
      pulseAnim2.setValue(0);
      pulseAnim3.setValue(0);
      return;
    }

    const createPulseLoop = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const loop1 = createPulseLoop(pulseAnim1, 0);
    const loop2 = createPulseLoop(pulseAnim2, 1000);
    const loop3 = createPulseLoop(pulseAnim3, 2000);

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [isActive, pulseAnim1, pulseAnim2, pulseAnim3]);

  if (!isActive) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
      ]}
      testID="driver-radar-scanner"
    >
      {/* Wave 1 */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size,
            height: size,
            borderColor: 'rgba(245, 158, 11, 0.35)', // Amber
            transform: [
              {
                scale: pulseAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 1],
                }),
              },
            ],
            opacity: pulseAnim1.interpolate({
              inputRange: [0, 0.4, 0.8, 1],
              outputRange: [0.7, 0.5, 0.2, 0],
            }),
          },
        ]}
      />

      {/* Wave 2 */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size,
            height: size,
            borderColor: 'rgba(11, 37, 69, 0.45)', // Midnight Navy
            transform: [
              {
                scale: pulseAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 1],
                }),
              },
            ],
            opacity: pulseAnim2.interpolate({
              inputRange: [0, 0.4, 0.8, 1],
              outputRange: [0.6, 0.4, 0.15, 0],
            }),
          },
        ]}
      />

      {/* Wave 3 */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size,
            height: size,
            borderColor: 'rgba(245, 158, 11, 0.25)', // Amber
            transform: [
              {
                scale: pulseAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 1],
                }),
              },
            ],
            opacity: pulseAnim3.interpolate({
              inputRange: [0, 0.4, 0.8, 1],
              outputRange: [0.5, 0.3, 0.1, 0],
            }),
          },
        ]}
      />

      {/* Center Radar Core Disc */}
      <View style={styles.coreDisc}>
        <View style={styles.coreDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    position: 'absolute',
    top: '38%',
    zIndex: 5,
  },
  pulseRing: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    position: 'absolute',
  },
  coreDisc: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 37, 69, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  coreDot: {
    backgroundColor: '#F59E0B',
    borderRadius: radius.pill,
    height: 10,
    width: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
