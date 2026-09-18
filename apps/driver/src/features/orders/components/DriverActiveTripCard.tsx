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
  haptic,
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
    try {
      haptic.light();
    } catch {
      // safe fallback
    }
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
    try {
      haptic.light();
    } catch {
      // safe fallback
    }
    const isPickupLeg = trip.status === 'ACCEPTED' || trip.status === 'PICKING_UP';
    const target = isPickupLeg ? trip.route.origin : trip.route.destination;
    openExternalNavigation(target);
  };

  const handleOpenActiveMission = () => {
    try {
      haptic.medium();
    } catch {
      // safe fallback
    }
    if (onOpenOrder) {
      onOpenOrder(trip.id);
    }
  };

  const isPickup = trip.status === 'ACCEPTED' || trip.status === 'PICKING_UP';
  const navHint = isPickup ? 'Chỉ đường tới điểm lấy' : 'Chỉ đường tới điểm giao';

  return (
    <Card style={styles.outerContainer} testID="driver-active-trip-slab">
      {/* Card Header */}
      <HStack style={styles.cardHeader}>
        <HStack space="xs" style={styles.headerLeft}>
          <Box style={styles.tripIconChip}>
            <IconSpeedTruck color={leopardPalette.primary} size={18} />
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

      {/* Inset Route Spine: Point A -> Track -> Point B */}
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
            <IconClock color={leopardPalette.primary} size={13} />
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
          <IconShieldAlert color="#D97706" size={15} />
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

      {/* Customer Contact Bar (Call & Nav buttons) */}
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
            style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.iconBtnPressed : null]}
            testID="driver-nav-leg-btn"
          >
            <IconRoute color="#0B2545" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel="Gọi cho khách hàng"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleCall}
            style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.iconBtnPressed : null]}
            testID="driver-call-btn"
          >
            <IconPhone color="#16A34A" size={18} />
          </Pressable>
        </View>
      </View>

      {/* Primary CTA Button (52pt height, Apple Squircle, High-Contrast Navy CTA) */}
      <Pressable
        accessibilityHint="Mở chi tiết chuyến đang thực hiện"
        accessibilityLabel={`Mở chuyến ${trip.reference}, trạng thái ${trip.status}`}
        accessibilityRole="button"
        onPress={handleOpenActiveMission}
        style={({ pressed }) => [styles.primaryActionBtn, pressed ? styles.primaryActionBtnPressed : null]}
      >
        <Text style={styles.primaryActionText}>Tiếp tục chuyến →</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.neutral.surface,
    borderColor: '#E2E8F0',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 2,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tripIconChip: {
    alignItems: 'center',
    backgroundColor: '#F0F4FA',
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sectionTitle: {
    ...typeScale.caption2,
    color: colors.neutral.subtleText,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  activeReference: {
    ...typeScale.subheadline,
    color: leopardPalette.primary,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  missionProgressSection: {
    marginBottom: spacing.sm,
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  livePulseDot: {
    backgroundColor: '#16A34A',
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  liveBadgeText: {
    color: '#166534',
    ...typeScale.caption2,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Inset Route Spine
  routeSpineBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  spineIndicatorCol: {
    alignItems: 'center',
    marginRight: spacing.sm - spacing.xxs,
    paddingVertical: spacing.hairline,
    width: 22,
  },
  spinePointA: {
    alignItems: 'center',
    backgroundColor: '#16A34A', // Emerald Point A
    borderRadius: radius.pill,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextA: {
    ...typeScale.caption2,
    color: colors.neutral.surface,
    fontWeight: '700',
  },
  spineTrack: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: spacing.xxs,
    width: 2,
  },
  spinePointB: {
    alignItems: 'center',
    backgroundColor: '#EA580C', // Amber Point B
    borderRadius: 4,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextB: {
    ...typeScale.caption2,
    color: colors.neutral.surface,
    fontWeight: '700',
  },
  spineLabelsCol: {
    flex: 1,
    gap: spacing.xs,
  },
  locationGroup: {},
  pointTypeA: {
    ...typeScale.caption2,
    color: '#16A34A',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  originAddress: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    fontWeight: '600',
    marginTop: spacing.hairline,
  },
  pointTypeB: {
    ...typeScale.caption2,
    color: '#EA580C',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  destAddress: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    fontWeight: '600',
    marginTop: spacing.hairline,
  },
  etaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingVertical: spacing.hairline,
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
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  livePulseDotGreen: {
    backgroundColor: '#16A34A',
    borderRadius: radius.pill,
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
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    marginTop: spacing.hairline,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  contactIconBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: '#CBD5E1',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Primary CTA (52pt height)
  primaryActionBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.cardLg,
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
  primaryActionBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  primaryActionText: {
    color: colors.neutral.surface,
    ...typeScale.subheadline,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
