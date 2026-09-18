import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, leopardPalette, radius } from '../theme/tokens';
import type { MapCoordinate } from './types';

import Svg, { Path } from 'react-native-svg';

export type SmoothVehicleMarkerProps = Readonly<{
  coords?: MapCoordinate;
  heading?: number;
  isActive?: boolean;
  size?: number;
}>;

/**
 * High-performance animated Google Maps style Navigation Arrow marker.
 * Applies continuous bearing rotation and pulsing beacon radar waves.
 * Features the signature Google Maps / Apple Maps navigation chevron arrow.
 */
export const SmoothVehicleMarker = memo(function SmoothVehicleMarker({
  heading = 0,
  isActive = true,
  size = 40,
}: SmoothVehicleMarkerProps) {
  // Bearing rotation animation
  const headingAnim = useRef(new Animated.Value(heading)).current;
  
  // Concentric Radar Scanner ripple wave animations (radiating from vehicle center)
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headingAnim, {
      toValue: heading,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [heading, headingAnim]);

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
            duration: 3000,
            easing: Easing.out(Easing.ease),
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

  const waveScale1 = pulseAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 3.2],
  });
  const waveOpacity1 = pulseAnim1.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [0.75, 0.45, 0.15, 0],
  });

  const waveScale2 = pulseAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 3.2],
  });
  const waveOpacity2 = pulseAnim2.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [0.65, 0.4, 0.12, 0],
  });

  const waveScale3 = pulseAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 3.2],
  });
  const waveOpacity3 = pulseAnim3.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [0.55, 0.3, 0.08, 0],
  });

  const spin = headingAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]} testID="smooth-vehicle-marker">
      {isActive ? (
        <>
          {/* Wave 1: Cheetah Golden Amber Radar Wave */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.radarWave,
              styles.radarWaveAmber,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [{ scale: waveScale1 }],
                opacity: waveOpacity1,
              },
            ]}
          />
          {/* Wave 2: Royal Blue Radar Wave */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.radarWave,
              styles.radarWaveBlue,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [{ scale: waveScale2 }],
                opacity: waveOpacity2,
              },
            ]}
          />
          {/* Wave 3: Outer Amber Wave */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.radarWave,
              styles.radarWaveAmberSoft,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                transform: [{ scale: waveScale3 }],
                opacity: waveOpacity3,
              },
            ]}
          />
        </>
      ) : null}

      <Animated.View
        style={[
          styles.markerBody,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <Svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24" fill="none">
          {/* Google Maps signature navigation chevron arrow */}
          <Path
            d="M12 2L20.5 20.5L12 16.5L3.5 20.5L12 2Z"
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarWave: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  radarWaveAmber: {
    borderColor: 'rgba(245, 158, 11, 0.55)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  radarWaveBlue: {
    borderColor: 'rgba(37, 99, 235, 0.5)',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  radarWaveAmberSoft: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  markerBody: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
    borderWidth: 2.5,
    elevation: 6,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 2,
  },
});
