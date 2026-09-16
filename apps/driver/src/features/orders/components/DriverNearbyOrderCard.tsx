import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  radius,
  spacing,
  IconRoute,
  IconSpeedTruck,
  StatusBadge,
  iosContinuousCurve,
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
    <View style={styles.cardContainer}>
      <Pressable
        accessibilityLabel={`Xem chi tiết đơn ${item.reference}, ${item.publicRouteLabel}`}
        accessibilityRole="button"
        onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
        style={({ pressed }) => [styles.cardPressable, pressed ? styles.pressed : null]}
      >
        {/* Row 1: Vehicle Badge + Proximity | Price */}
        <View style={styles.topRow}>
          <View style={styles.tagGroup}>
            <View style={styles.vehicleBadge}>
              <IconSpeedTruck color="#0B1E42" size={12} />
              <Text style={styles.vehicleTagText}>{item.vehicleLabel}</Text>
            </View>
            <Text style={styles.proximityText}>
              {item.pickupDistanceLabel ?? 'Đang cập nhật'}
            </Text>
          </View>
          <View style={styles.priceWrap}>
            <Text style={styles.priceAmount}>{item.priceLabel ?? 'Đang cập nhật'}</Text>
          </View>
        </View>

        {/* Row 2: Route Spine (Compact 2-line vertical spine) */}
        <View style={styles.routeRow}>
          <View style={styles.spineCol}>
            <View style={styles.dotPickup} />
            <View style={styles.spineLine} />
            <View style={styles.dotDropoff} />
          </View>
          <View style={styles.addressCol}>
            <Text numberOfLines={1} style={styles.addressText}>
              {pickupLabel}
            </Text>
            <Text numberOfLines={1} style={styles.addressText}>
              {dropoffLabel}
            </Text>
          </View>
          <View style={styles.distanceBadge}>
            <IconRoute color="#64748B" size={11} />
            <Text style={styles.distanceText}>{distanceEtaText}</Text>
          </View>
        </View>

        {/* Row 3: Cargo & Reference snippet */}
        <View style={styles.metaRow}>
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
        </View>
      </Pressable>

      {/* Row 4: Compact Grab-style Action Buttons */}
      <View style={styles.actionBar}>
        <Pressable
          accessibilityLabel="Bỏ qua đơn này"
          accessibilityRole="button"
          onPress={onDecline ? () => onDecline(item.id) : undefined}
          style={({ pressed }) => [styles.declineBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.declineText}>Bỏ qua</Text>
        </Pressable>

        <Pressable
          accessibilityLabel={`Nhận đơn ${item.reference}`}
          accessibilityRole="button"
          onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
          style={({ pressed }) => [styles.acceptBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.acceptText}>Nhận đơn</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 14,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardPressable: {},
  // Row 1: Top metadata + Price
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tagGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  vehicleBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 6,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  vehicleTagText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  proximityText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    color: '#0B1E42',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },

  // Row 2: Route Spine
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  spineCol: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'space-between',
    marginRight: 8,
    paddingVertical: 2,
    width: 8,
  },
  dotPickup: {
    backgroundColor: '#0B1E42',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  spineLine: {
    backgroundColor: '#CBD5E1',
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
    gap: 3,
    justifyContent: 'center',
  },
  addressText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  distanceBadge: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 6,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  distanceText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Row 3: Metadata snippet
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  cargoNameText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  cargoWeightText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  loadingText: {
    color: '#D97706',
    fontSize: 11.5,
    fontWeight: '600',
  },
  refDot: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  refText: {
    color: '#94A3B8',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },

  // Row 4: Compact Actions
  actionBar: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  declineBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    ...iosContinuousCurve,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  declineText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  acceptBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 8,
    ...iosContinuousCurve,
    flex: 1,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
