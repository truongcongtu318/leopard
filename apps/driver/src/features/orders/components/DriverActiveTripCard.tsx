import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Box,
  Card,
  HStack,
  IconClock,
  IconPhone,
  IconRoute,
  IconShieldAlert,
  IconSpeedTruck,
  StatusBadge,
  VStack,
  colors,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverActiveTripView } from '../model';
import { callPhoneNumber } from './detail/CargoAndContactCard';
import { MissionStepper } from './detail/MissionStepper';
import { openExternalNavigation } from './detail/MissionMapCanvas';

export type DriverActiveTripCardProps = Readonly<{
  trip: DriverActiveTripView;
  onOpenOrder?: (orderId: string) => void;
  onNavigate?: (route: string) => void;
}>;

export function DriverActiveTripCard({
  onNavigate,
  onOpenOrder,
  trip,
}: DriverActiveTripCardProps) {
  const handleCall = () => {
    if (!trip.customerContact) {
      Alert.alert(
        'Chưa có số điện thoại',
        'Chưa có số điện thoại thực tế cho liên hệ chặng này. Vui lòng kiểm tra lại trong chi tiết đơn hàng.',
      );
      return;
    }
    callPhoneNumber(trip.customerContact);
  };

  const handleNavigateLeg = () => {
    const isPickupLeg = trip.status === 'ACCEPTED' || trip.status === 'PICKING_UP';
    const target = isPickupLeg ? trip.route.origin : trip.route.destination;
    openExternalNavigation(target);
  };

  const isPickup = trip.status === 'ACCEPTED' || trip.status === 'PICKING_UP';
  const navHint = isPickup ? 'Chỉ đường tới điểm lấy' : 'Chỉ đường tới điểm giao';

  return (
    <Card style={styles.outerContainer} testID="driver-active-trip-slab">
      <HStack style={styles.cardHeader}>
        <HStack space="xs" style={styles.headerLeft}>
          <Box style={styles.tripIconChip}>
            <IconSpeedTruck color={leopardPalette.primary} size={16} />
          </Box>
          <Box>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Chuyến đang thực hiện
            </Text>
            <Text style={styles.activeReference}>{trip.reference}</Text>
          </Box>
        </HStack>
        <HStack space="xs" style={styles.headerRight}>
          <Box style={styles.liveBadge}>
            <Box style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>Đang chạy</Text>
          </Box>
          <StatusBadge domain="order" status={trip.status} />
        </HStack>
      </HStack>

      {/* 4-Stage Mission Progress Stepper */}
      <Box style={styles.missionProgressSection}>
        <MissionStepper status={trip.status} />
      </Box>

      {/* Route Spine: Point A -> Track -> Point B */}
      <View style={styles.routeSpineBox}>
        <View style={styles.spineIndicatorCol}>
          <View style={styles.spinePointA}>
            <Text style={styles.spinePointTextA}>A</Text>
          </View>
          <View style={styles.spineTrack} />
          <View style={styles.spinePointB}>
            <Text style={styles.spinePointTextB}>B</Text>
          </View>
        </View>

        <View style={styles.spineLabelsCol}>
          <View style={styles.locationGroup}>
            <Text style={styles.pointTypeA}>Điểm lấy hàng (A)</Text>
            <Text numberOfLines={2} style={styles.originAddress}>
              {trip.route.origin.label}
            </Text>
          </View>

          <View style={styles.etaRow}>
            <IconClock color={leopardPalette.primary} size={12} />
            <Text style={styles.etaText}>
              Lộ trình · ETA dự kiến: {trip.route.distanceLabel}
            </Text>
          </View>

          <View style={styles.locationGroup}>
            <Text style={styles.pointTypeB}>Điểm giao hàng (B)</Text>
            <Text numberOfLines={2} style={styles.destAddress}>
              {trip.route.destination.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Proof warning banner */}
      {trip.proofLabel ? (
        <View style={styles.proofWarningBanner}>
          <IconShieldAlert color="#D97706" size={14} />
          <Text style={styles.proofWarningText}>{trip.proofLabel}</Text>
        </View>
      ) : null}

      {/* Live tracking signal row */}
      {trip.trackingLabel ? (
        <View style={styles.trackingSignalRow}>
          <View style={styles.livePulseDotGreen} />
          <Text numberOfLines={1} style={styles.trackingText}>
            {trip.trackingLabel}
          </Text>
        </View>
      ) : null}

      {/* Customer Contact Bar (Call & Chat buttons) */}
      <View style={styles.contactBar}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Khách hàng người nhận</Text>
          <Text style={styles.contactPhone}>0988 ••• 128 (Bảo mật)</Text>
        </View>
        <View style={styles.contactButtons}>
          <Pressable
            accessibilityHint={navHint}
            accessibilityLabel="Mở Google Maps chỉ đường chặng này"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleNavigateLeg}
            style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.pressed : null]}
            testID="driver-nav-leg-btn"
          >
            <IconRoute color="#0B1E42" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel="Gọi cho khách hàng"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleCall}
            style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.pressed : null]}
            testID="driver-call-btn"
          >
            <IconPhone color="#16A34A" size={18} />
          </Pressable>
        </View>
      </View>

      {/* Primary CTA Button (52px height, High-Contrast Orange background with Navy Bold text) */}
      <Pressable
        accessibilityHint="Mở chi tiết chuyến đang thực hiện"
        accessibilityLabel={`Mở chuyến ${trip.reference}, trạng thái ${trip.status}`}
        accessibilityRole="button"
        onPress={onOpenOrder ? () => onOpenOrder(trip.id) : undefined}
        style={({ pressed }) => [styles.primaryActionBtn, pressed ? styles.pressed : null]}
      >
        <Text style={styles.primaryActionText}>Tiếp tục chuyến →</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.neutral.surface,
    borderColor: leopardPalette.primary,
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 3,
    marginBottom: 16,
    padding: 16,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  tripIconChip: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: leopardPalette.inputBorder,
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionTitle: {
    ...typeScale.caption2,
    color: colors.neutral.subtleText,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  activeReference: {
    ...typeScale.subheadline,
    color: leopardPalette.primary,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  missionProgressSection: {
    marginBottom: 12,
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  livePulseDot: {
    backgroundColor: '#16A34A',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  liveBadgeText: {
    color: '#166534',
    ...typeScale.caption2,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Route Spine
  routeSpineBox: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
  },
  spineIndicatorCol: {
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 2,
    width: 22,
  },
  spinePointA: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextA: {
    ...typeScale.caption2,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  spineTrack: {
    backgroundColor: leopardPalette.inputBorder,
    flex: 1,
    marginVertical: 4,
    width: 2,
  },
  spinePointB: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextB: {
    ...typeScale.caption2,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  spineLabelsCol: {
    flex: 1,
    gap: 6,
  },
  locationGroup: {},
  pointTypeA: {
    ...typeScale.caption2,
    color: colors.neutral.subtleText,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  originAddress: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    fontWeight: '600',
    marginTop: 1,
  },
  pointTypeB: {
    ...typeScale.caption2,
    color: '#C2410C',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  destAddress: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    fontWeight: '600',
    marginTop: 1,
  },
  etaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  etaText: {
    ...typeScale.caption1,
    color: leopardPalette.primary,
    fontWeight: '700',
  },

  // Proof warning
  proofWarningBanner: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  proofWarningText: {
    ...typeScale.caption1,
    color: '#92400E',
    flex: 1,
    fontWeight: '600',
  },

  // Tracking signal
  trackingSignalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  livePulseDotGreen: {
    backgroundColor: '#16A34A',
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  trackingText: {
    ...typeScale.caption1,
    color: colors.neutral.mutedText,
  },

  // Customer contact bar
  contactBar: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    ...typeScale.caption2,
    color: colors.neutral.subtleText,
    fontWeight: '600',
  },
  contactPhone: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    fontWeight: '600',
    marginTop: 1,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactIconBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: leopardPalette.inputBorder,
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Primary CTA (52px height)
  primaryActionBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: 16,
    ...iosContinuousCurve,
    height: 52,
    justifyContent: 'center',
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  primaryActionText: {
    color: colors.neutral.surface,
    ...typeScale.subheadline,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
