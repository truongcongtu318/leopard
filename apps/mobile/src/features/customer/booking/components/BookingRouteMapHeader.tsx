import React from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  // Nav bar opacity when scrolling past 120pt
  const navBgOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [80, 140],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0;

  const titleOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [100, 140],
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
          height={180}
          originLabel={pickupAddress}
        />
      </View>

      {/* Dynamic Navigation Bar overlay */}
      <Animated.View style={[styles.navBarOverlay, { opacity: navBgOpacity }]} />

      {/* Floating Header Controls */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.circleGlassBtn}
        >
          <IconChevronLeft color={customerPalette.primary} size={20} />
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
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  mapWrap: {
    ...StyleSheet.absoluteFillObject,
    height: 180,
  },
  navBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  headerBar: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  circleGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: {
    ...typeScale.headline,
    fontWeight: '600',
    color: customerPalette.textPrimary,
  },
  placeholderRight: {
    width: 44,
    height: 44,
  },
});
