import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Box,
  Card,
  HStack,
  IconRoute,
  IconSpeedTruck,
  StatusBadge,
  VStack,
  colors,
  driverPrimitives,
  haptic,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverPublicOrderView } from '../model';

export type DriverNearbyOrderCardProps = Readonly<{
  item: DriverPublicOrderView;
  onOpenOrder?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
}>;

/**
 * Grab/Lalamove-style compact job list row.
 *
 * Prioritizes high information density, fast scanning while on the road, and
 * eliminates bloated vertical padding so drivers see 3-4 orders per screen.
 */
export function DriverNearbyOrderCard({
  item,
  onDecline,
  onOpenOrder,
}: DriverNearbyOrderCardProps) {
  const pickupLabel =
    item.pickupLocationLabel ||
    item.publicRouteLabel.split('→')[0]?.trim() ||
    'Điểm lấy hàng';

  const dropoffLabel =
    item.dropoffLocationLabel ||
    item.publicRouteLabel.split('→')[1]?.trim() ||
    'Điểm giao hàng';

  const distanceEtaText = item.distanceLabel
    ? `${item.distanceLabel} (${item.etaLabel?.replace(/Thời gian dự kiến\s*·?\s*/i, '') || ''})`
    : item.etaLabel;

  const rawCargoSummary = item.cargoSummary?.trim() || '';
  const cargoParts = rawCargoSummary ? rawCargoSummary.split('·').map((s) => s.trim()) : [];
  const cargoName =
    item.cargoName?.trim() ||
    (cargoParts.length > 0 && cargoParts[0] ? cargoParts[0] : 'Hàng hóa tiêu chuẩn');

  let cargoWeight = item.cargoWeightKg
    ? `${item.cargoWeightKg.toLocaleString('vi-VN')} kg`
    : null;
  if (!cargoWeight && cargoParts.length > 1) {
    cargoWeight = cargoParts[1].replace(/^khoảng\s*/i, '');
  } else if (!cargoWeight && rawCargoSummary.includes('kg')) {
    const match = rawCargoSummary.match(/([0-9.,]+\s*(?:kg|tấn))/i);
    if (match) cargoWeight = match[1];
  }

  const loadingFee = item.loadingFee ?? null;
  const loadingDesc = item.loadingDescription?.trim() || null;
  const hasLoadingFee = typeof loadingFee === 'number' && loadingFee > 0;
  const loadingFeeBadge = hasLoadingFee
    ? loadingDesc
      ? `${loadingDesc} (+${loadingFee.toLocaleString('vi-VN')} ₫)`
      : `Bốc xếp (+${loadingFee.toLocaleString('vi-VN')} ₫)`
    : loadingDesc;

  return (
    <Card style={styles.cardContainer}>
      <Pressable
        accessibilityLabel={`Xem chi tiết đơn ${item.reference}, ${item.publicRouteLabel}`}
        accessibilityRole="button"
        onPress={
          onOpenOrder
            ? () => {
                haptic.light();
                onOpenOrder(item.id);
              }
            : undefined
        }
        style={({ pressed }) => [styles.cardPressable, pressed ? styles.pressedCard : null]}
      >
        {/* Row 1: Vehicle Badge + Proximity | Price */}
        <HStack style={styles.topRow}>
          <HStack style={styles.tagGroup}>
            <Badge action="muted" style={styles.vehicleBadge}>
              <IconSpeedTruck color={leopardPalette.primary} size={12} />
              <Badge.Text style={styles.vehicleTagText}>{item.vehicleLabel}</Badge.Text>
            </Badge>
            <Text style={styles.proximityText}>
              {item.pickupDistanceLabel ?? 'Đang cập nhật'}
            </Text>
          </HStack>
          <Box style={styles.priceWrap}>
            <Text style={styles.priceAmount}>{item.priceLabel ?? 'Đang cập nhật'}</Text>
          </Box>
        </HStack>

        {/* Row 2: Route Spine (Compact 2-line vertical spine) */}
        <HStack style={styles.routeRow}>
          <VStack style={styles.spineCol}>
            <Box style={styles.dotPickup} />
            <Box style={styles.spineLine} />
            <Box style={styles.dotDropoff} />
          </VStack>
          <VStack style={styles.addressCol}>
            <Text numberOfLines={1} style={styles.addressText}>
              {pickupLabel}
            </Text>
            <Text numberOfLines={1} style={styles.addressText}>
              {dropoffLabel}
            </Text>
          </VStack>
          <HStack style={styles.distanceBadge}>
            <IconRoute color="#1D4ED8" size={12} />
            <Text style={styles.distanceText}>{distanceEtaText}</Text>
          </HStack>
        </HStack>

        {/* Row 3: Cargo & Reference snippet */}
        <HStack style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.cargoNameText} testID="nearby-order-cargo-name">
            {cargoName}
          </Text>
          {cargoWeight ? (
            <Text style={styles.cargoWeightText} testID="nearby-order-cargo-weight">
              · {cargoWeight}
            </Text>
          ) : null}
          {loadingFeeBadge ? (
            <Text numberOfLines={1} style={styles.loadingText}>
              · {loadingFeeBadge}
            </Text>
          ) : null}
          <Text style={styles.refDot}>·</Text>
          <Text style={styles.refText}>{item.reference}</Text>
        </HStack>
      </Pressable>

      {/* Row 4: Compact Grab-style Action Buttons */}
      <HStack style={styles.actionBar}>
        <Pressable
          accessibilityLabel="Bỏ qua đơn này"
          accessibilityRole="button"
          onPress={
            onDecline
              ? () => {
                  haptic.light();
                  onDecline(item.id);
                }
              : undefined
          }
          style={({ pressed }) => [styles.declineBtn, pressed ? styles.pressedDecline : null]}
        >
          <Text style={styles.declineText}>Bỏ qua</Text>
        </Pressable>

        <Pressable
          accessibilityLabel={`Nhận đơn ${item.reference}`}
          accessibilityRole="button"
          onPress={
            onOpenOrder
              ? () => {
                  haptic.medium();
                  onOpenOrder(item.id);
                }
              : undefined
          }
          style={({ pressed }) => [styles.acceptBtn, pressed ? styles.pressedAccept : null]}
        >
          <Text style={styles.acceptText}>Nhận đơn</Text>
        </Pressable>
      </HStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.neutral.surface,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 8,
    padding: 14,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardPressable: {},
  pressedCard: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  // Row 1: Top metadata + Price
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tagGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  vehicleBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vehicleTagText: {
    ...typeScale.caption2,
    color: leopardPalette.primary,
    fontWeight: '700',
  },
  proximityText: {
    ...typeScale.caption1,
    color: driverPrimitives.colors.gray700,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    ...typeScale.title3,
    fontSize: 20,
    color: driverPrimitives.colors.orange500,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Row 2: Route Spine
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  spineCol: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'space-between',
    marginRight: 10,
    paddingVertical: 2,
    width: 8,
  },
  dotPickup: {
    backgroundColor: leopardPalette.primary,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  spineLine: {
    backgroundColor: leopardPalette.inputBorder,
    flex: 1,
    marginVertical: 2,
    width: 1.5,
  },
  dotDropoff: {
    backgroundColor: '#EA580C',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  addressCol: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  addressText: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  distanceBadge: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  distanceText: {
    ...typeScale.caption2,
    color: '#1D4ED8',
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },

  // Row 3: Metadata snippet
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  cargoNameText: {
    ...typeScale.caption1,
    color: colors.neutral.mutedText,
    fontWeight: '500',
  },
  cargoWeightText: {
    ...typeScale.caption1,
    color: colors.neutral.subtleText,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  loadingText: {
    ...typeScale.caption2,
    color: '#D97706',
    fontWeight: '600',
  },
  refDot: {
    ...typeScale.caption2,
    color: leopardPalette.inputBorder,
  },
  refText: {
    ...typeScale.caption2,
    color: colors.neutral.mutedText,
    fontVariant: ['tabular-nums'],
  },

  // Row 4: Compact Actions
  actionBar: {
    alignItems: 'center',
    borderTopColor: colors.neutral.surfaceMuted,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  declineBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    ...iosContinuousCurve,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  declineText: {
    ...typeScale.footnote,
    color: colors.neutral.subtleText,
    fontWeight: '600',
  },
  pressedDecline: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  acceptBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.orange500,
    borderRadius: 10,
    ...iosContinuousCurve,
    flex: 1,
    height: 40,
    justifyContent: 'center',
    shadowColor: driverPrimitives.colors.orange500,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  acceptText: {
    ...typeScale.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressedAccept: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  pressed: {
    opacity: 0.8,
  },
});
