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
  IconRoute,
  LeopardMapView,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  resolveLocationCoords,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { useSafeInsets } from '../safe-insets';

export interface BookingRouteMapHeaderProps {
  onBack: () => void;
  scrollY?: Animated.Value;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  stops?: readonly { id: string; label: string; coords?: { lat: number; lng: number } }[];
  routeCoords?: readonly { lat: number; lng: number }[];
  mapHeight?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function BookingRouteMapHeader({
  onBack,
  scrollY,
  pickupAddress,
  dropoffAddress,
  pickupCoords,
  dropoffCoords,
  stops = [],
  routeCoords,
  mapHeight = 250,
  isExpanded = false,
  onToggleExpand,
}: BookingRouteMapHeaderProps) {
  const insets = useSafeInsets();
  const topInset = insets.top || 44;

  const handleBack = () => {
    haptic.light();
    onBack();
  };

  const handleToggleExpand = () => {
    haptic.selection();
    onToggleExpand?.();
  };

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

  const effectivePickupCoords =
    pickupCoords || (pickupAddress ? resolveLocationCoords(pickupAddress) : undefined);
  const effectiveDropoffCoords =
    dropoffCoords ||
    (dropoffAddress ? resolveLocationCoords(dropoffAddress, effectivePickupCoords) : undefined);

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      {/* Dynamic Route Map Background - FULLY INTERACTIVE */}
      <View style={[styles.mapWrap, { height: mapHeight }]}>
        <LeopardMapView
          destination={{
            label: dropoffAddress,
            coords: effectiveDropoffCoords,
          }}
          height="100%"
          interactive={true}
          mode="route"
          origin={{
            label: pickupAddress,
            coords: effectivePickupCoords,
          }}
          routeCoords={routeCoords}
          stops={stops}
        />
      </View>

      {/* Dynamic Navigation Bar overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.navBarOverlay,
          { height: topInset + 44, opacity: navBgOpacity },
        ]}
      />

      {/* Floating Header Controls */}
      <View pointerEvents="box-none" style={[styles.headerBar, { top: topInset }]}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          onPress={handleBack}
          style={({ pressed }) => [styles.circleGlassBtn, pressed && styles.btnPressed]}
          testID="btn-booking-back"
        >
          <IconChevronLeft color={customerPalette.primary} size={22} />
        </Pressable>

        <Animated.View style={[styles.titleWrap, { opacity: titleOpacity }]}>
          <Text numberOfLines={1} style={styles.inlineTitle}>
            Đặt xe
          </Text>
        </Animated.View>

        {onToggleExpand ? (
          <Pressable
            accessibilityLabel={isExpanded ? 'Thu nhỏ bản đồ' : 'Xem toàn cảnh bản đồ'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleToggleExpand}
            style={({ pressed }) => [styles.circleGlassBtn, pressed && styles.btnPressed]}
          >
            <IconRoute color={customerPalette.primary} size={18} />
          </Pressable>
        ) : (
          <View style={styles.placeholderRight} />
        )}
      </View>

      {/* Floating Interactive Badge at bottom-right of map */}
      {onToggleExpand ? (
        <View style={styles.bottomMapBadgeWrap}>
          <Pressable
            accessibilityLabel={isExpanded ? 'Thu nhỏ bản đồ' : 'Chạm để xem toàn cảnh bản đồ'}
            accessibilityRole="button"
            onPress={handleToggleExpand}
            style={({ pressed }) => [styles.mapInteractivePill, pressed && styles.btnPressed]}
          >
            <IconRoute color={customerPalette.primary} size={13} />
            <Text style={styles.mapInteractivePillText}>
              {isExpanded ? 'Thu nhỏ ▾' : 'Toàn cảnh bản đồ ▴'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapWrap: {
    ...StyleSheet.absoluteFill,
  },
  navBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
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
    paddingHorizontal: spacing.md,
    zIndex: 20,
  },
  circleGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
    ...iosContinuousCurve,
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
    color: customerPalette.textSlateDark,
  },
  placeholderRight: {
    width: 44,
    height: 44,
  },
  bottomMapBadgeWrap: {
    position: 'absolute',
    bottom: spacing.md + 14,
    right: spacing.md,
    zIndex: 15,
  },
  mapInteractivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
    ...iosContinuousCurve,
  },
  mapInteractivePillText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.primary,
  },
});
