import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconClock,
  IconMessage,
  IconPhone,
  IconShieldAlert,
  IconSpeedTruck,
  StatusBadge,
  colors,
  leopardPalette,
  radius,
  spacing,
} from '@leopard/mobile-core';
import type { DriverActiveTripView } from '../model';
import { callPhoneNumber } from './detail/CargoAndContactCard';

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

  const handleChat = () => {
    if (onNavigate) {
      const contact = trip.customerContact ? `?customerContact=${encodeURIComponent(trip.customerContact)}` : '';
      onNavigate(`/chat/${trip.id}${contact}`);
    } else if (onOpenOrder) {
      onOpenOrder(trip.id);
    }
  };

  return (
    <View style={styles.outerContainer} testID="driver-active-trip-slab">
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.tripIconChip}>
            <IconSpeedTruck color={leopardPalette.primary} size={16} />
          </View>
          <View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Chuyến đang thực hiện
            </Text>
            <Text style={styles.activeReference}>{trip.reference}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>ĐANG CHẠY</Text>
          </View>
          <StatusBadge domain="order" status={trip.status} />
        </View>
      </View>

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
            <Text style={styles.pointTypeA}>ĐIỂM LẤY HÀNG (A)</Text>
            <Text numberOfLines={2} style={styles.originAddress}>
              {trip.route.origin.label}
            </Text>
          </View>

          <View style={styles.etaRow}>
            <IconClock color={leopardPalette.primary} size={12} />
            <Text style={styles.etaText}>
              Lộ trình · ETA {trip.route.distanceLabel}
            </Text>
          </View>

          <View style={styles.locationGroup}>
            <Text style={styles.pointTypeB}>ĐIỂM GIAO HÀNG (B)</Text>
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
            accessibilityLabel="Gọi cho khách hàng"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleCall}
            style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.pressed : null]}
            testID="driver-call-btn"
          >
            <IconPhone color="#16A34A" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel="Nhắn tin trong ứng dụng"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleChat}
            style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.pressed : null]}
            testID="driver-chat-btn"
          >
            <IconMessage color="#1D4ED8" size={18} />
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
    </View>
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
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  activeReference: {
    color: leopardPalette.primary,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
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
    fontSize: 10,
    fontWeight: '800',
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
    color: colors.neutral.surface,
    fontSize: 11,
    fontWeight: '800',
  },
  spineTrack: {
    backgroundColor: leopardPalette.inputBorder,
    flex: 1,
    marginVertical: 4,
    width: 2,
  },
  spinePointB: {
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextB: {
    color: leopardPalette.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  spineLabelsCol: {
    flex: 1,
    gap: 6,
  },
  locationGroup: {},
  pointTypeA: {
    color: colors.neutral.subtleText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  originAddress: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 1,
  },
  pointTypeB: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  destAddress: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 1,
  },
  etaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  etaText: {
    color: leopardPalette.primary,
    fontSize: 11.5,
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
    color: '#92400E',
    flex: 1,
    fontSize: 11.5,
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
    color: colors.neutral.mutedText,
    fontSize: 11.5,
    fontWeight: '500',
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
    color: colors.neutral.subtleText,
    fontSize: 10.5,
    fontWeight: '600',
  },
  contactPhone: {
    color: colors.neutral.text,
    fontSize: 12.5,
    fontWeight: '700',
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
    backgroundColor: '#F97316',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionText: {
    color: leopardPalette.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
