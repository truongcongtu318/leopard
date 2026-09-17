import React from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeInsets } from '../safe-insets';

import {
  IconChevronLeft,
  RouteMapSchematic,
  customerPalette,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export interface BookingRouteMapHeaderProps {
  onBack: () => void;
  scrollY?: Animated.Value;
  pickupAddress: string;
  dropoffAddress: string;
}

export function BookingRouteMapHeader({
  onBack,
  scrollY,
  pickupAddress,
  dropoffAddress,
}: BookingRouteMapHeaderProps) {
  const insets = useSafeInsets();
  const topInset = insets.top || 44;

  // Nav bar opacity when scrolling past 100pt
  const navBgOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [70, 130],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0;

  const titleOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [90, 130],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0;

  return (
    <View style={styles.container}>
      {/* 180pt Route Map Background */}
      <View style={styles.mapWrap}>
        <RouteMapSchematic
          destinationLabel={dropoffAddress}
          originLabel={pickupAddress}
        />
      </View>

      {/* Dynamic Navigation Bar overlay */}
      <Animated.View
        style={[
          styles.navBarOverlay,
          { height: topInset + 44, opacity: navBgOpacity },
        ]}
      />

      {/* Floating Header Controls */}
      <View style={[styles.headerBar, { top: topInset }]}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [styles.circleGlassBtn, pressed && styles.btnPressed]}
        >
          <IconChevronLeft color={customerPalette.primary} size={22} />
        </Pressable>

        <Animated.View style={[styles.titleWrap, { opacity: titleOpacity }]}>
          <Text numberOfLines={1} style={styles.inlineTitle}>
            Đặt xe
          </Text>
        </Animated.View>

        <View style={styles.placeholderRight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 190,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  mapWrap: {
    ...StyleSheet.absoluteFill,
    height: 190,
  },
  navBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
    zIndex: 10,
  },
  headerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  circleGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: {
    ...typeScale.headline,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
  },
  placeholderRight: {
    width: 44,
    height: 44,
  },
});
