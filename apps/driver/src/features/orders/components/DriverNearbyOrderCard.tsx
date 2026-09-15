import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  radius,
  spacing,
  IconClock,
  IconRoute,
  IconScaleWeight,
  IconSpeedTruck,
  StatusBadge,
} from '@leopard/mobile-core';
import type { DriverPublicOrderView } from '../model';

export type DriverNearbyOrderCardProps = Readonly<{
  item: DriverPublicOrderView;
  onOpenOrder?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
}>;

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
    ? `${item.distanceLabel} · ${item.etaLabel}`
    : item.etaLabel;

  const rawCargoSummary = item.cargoSummary?.trim() || '';
  const cargoParts = rawCargoSummary ? rawCargoSummary.split('·').map((s) => s.trim()) : [];
  const cargoName =
    (item as any).cargoName ||
    (cargoParts.length > 0 && cargoParts[0] ? cargoParts[0] : 'Hàng hóa tiêu chuẩn');

  let cargoWeight = (item as any).cargoWeightKg
    ? `${(item as any).cargoWeightKg.toLocaleString('vi-VN')} kg`
    : null;
  if (!cargoWeight && cargoParts.length > 1) {
    cargoWeight = cargoParts[1].replace(/^khoảng\s*/i, '');
  } else if (!cargoWeight && rawCargoSummary.includes('kg')) {
    const match = rawCargoSummary.match(/([0-9.,]+\s*(?:kg|tấn))/i);
    if (match) cargoWeight = match[1];
  }

  const cargoDimensions = (item as any).cargoDimensions || null;
  const loadingFee = (item as any).loadingFee;
  const loadingDesc = (item as any).loadingDescription;
  const hasLoadingFee = Boolean(loadingFee && loadingFee > 0);
  const loadingFeeBadge = hasLoadingFee
    ? loadingDesc
      ? `${loadingDesc} (+${loadingFee.toLocaleString('vi-VN')} ₫)`
      : `Bốc xếp (+${loadingFee.toLocaleString('vi-VN')} ₫)`
    : loadingDesc || null;

  return (
    <View style={styles.orderCardOuter}>
      <View style={styles.orderCardInner}>
        <Pressable
          accessibilityLabel={`Xem chi tiết đơn ${item.reference}, ${item.publicRouteLabel}`}
          accessibilityRole="button"
          onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
          style={({ pressed }) => [styles.cardBody, pressed ? styles.pressed : null]}
        >
          {/* Top Meta: Ref, Proximity, and Status */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardOrderRef}>{item.reference}</Text>
              <View style={styles.proximityDot} />
              <Text style={styles.proximityText}>
                {item.pickupDistanceLabel || 'Cách bạn 1.2 km'}
              </Text>
            </View>
            <StatusBadge domain="order" status={item.status} />
          </View>

          {/* Fare & Route Distance Strip */}
          <View style={styles.cardFareBanner}>
            <View style={styles.cardFareLeft}>
              <Text style={styles.cardFareCaption}>CƯỚC THỰC NHẬN DỰ KIẾN</Text>
              <Text style={styles.cardFareAmount}>{item.priceLabel || '285.000 ₫'}</Text>
            </View>
            <View style={styles.cardDistanceBadge}>
              <IconRoute color="#0B1E42" size={13} />
              <Text style={styles.cardDistanceText}>{distanceEtaText}</Text>
            </View>
          </View>

          {/* Route Spine: Point A -> Point B */}
          <View style={styles.cardRouteBlock}>
            <View style={styles.cardRouteSpineMini}>
              <View style={styles.spinePointDotA} />
              <View style={styles.spineDottedTrackMini} />
              <View style={styles.spinePointDotB} />
            </View>
            <View style={styles.cardRouteAddresses}>
              <Text numberOfLines={1} style={styles.cardPickupAddr}>
                {pickupLabel}
              </Text>
              <Text numberOfLines={1} style={styles.cardDropoffAddr}>
                {dropoffLabel}
              </Text>
            </View>
          </View>

          {/* Public route full label */}
          <Text numberOfLines={1} style={styles.cardPublicRouteSub}>
            {item.publicRouteLabel}
          </Text>

          {/* Cargo Specifications Bento Tag Grid */}
          <View style={styles.cargoBentoContainer} testID="nearby-order-cargo-bento">
            <View style={styles.cargoRow}>
              <View style={styles.cargoNameBadge} testID="nearby-order-cargo-name">
                <Text numberOfLines={1} style={styles.cargoNameText}>
                  {cargoName}
                </Text>
              </View>
              {cargoWeight ? (
                <View style={styles.cargoWeightBadge} testID="nearby-order-cargo-weight">
                  <IconScaleWeight color="#0B1E42" size={12} />
                  <Text style={styles.cargoWeightText}>{cargoWeight}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cargoSubRow}>
              <View style={styles.vehicleTag}>
                <IconSpeedTruck color="#475569" size={12} />
                <Text style={styles.vehicleTagText}>{item.vehicleLabel}</Text>
              </View>
              {cargoDimensions ? (
                <View style={styles.specBadge} testID="nearby-order-cargo-dimensions">
                  <Text style={styles.specBadgeText}>{cargoDimensions}</Text>
                </View>
              ) : null}
              {loadingFeeBadge ? (
                <View style={styles.loadingBadge} testID="nearby-order-loading-fee">
                  <Text style={styles.loadingBadgeText}>{loadingFeeBadge}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Card Footer: ETA and updated timestamp */}
          <View style={styles.cardFooter}>
            <View style={styles.priceEtaRow}>
              <IconClock color="#0B1E42" size={13} />
              <Text style={styles.priceText}>{item.etaLabel}</Text>
            </View>
            {item.updatedAtLabel ? (
              <Text style={styles.updatedText}>{item.updatedAtLabel}</Text>
            ) : null}
          </View>
        </Pressable>

        {/* Action Buttons Row: [ Bỏ qua ] & [ NHẬN ĐƠN ] */}
        <View style={styles.cardActionRow}>
          <Pressable
            accessibilityLabel="Bỏ qua đơn này"
            accessibilityRole="button"
            onPress={onDecline ? () => onDecline(item.id) : undefined}
            style={({ pressed }) => [styles.cardDeclineBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.cardDeclineText}>Bỏ qua</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Nhận đơn ${item.reference}`}
            accessibilityRole="button"
            onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
            style={({ pressed }) => [styles.cardAcceptBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.cardAcceptText}>
              NHẬN ĐƠN · {item.priceLabel || '285.000 ₫'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orderCardOuter: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 14,
    padding: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  orderCardInner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  cardBody: {
    borderRadius: 12,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cardOrderRef: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  proximityDot: {
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    height: 4,
    width: 4,
  },
  proximityText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  // Fare Banner
  cardFareBanner: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardFareLeft: {
    flex: 1,
  },
  cardFareCaption: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardFareAmount: {
    color: '#0B1E42',
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  cardDistanceBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardDistanceText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Route Block
  cardRouteBlock: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  cardRouteSpineMini: {
    alignItems: 'center',
    marginRight: 8,
    paddingVertical: 3,
    width: 14,
  },
  spinePointDotA: {
    backgroundColor: '#0B1E42',
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  spineDottedTrackMini: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: 2,
    width: 1.5,
  },
  spinePointDotB: {
    backgroundColor: '#F97316',
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  cardRouteAddresses: {
    flex: 1,
    gap: 4,
  },
  cardPickupAddr: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
  },
  cardDropoffAddr: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
  },
  cardPublicRouteSub: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 8,
  },

  // Cargo Bento Grid
  cargoBentoContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 8,
    padding: 8,
  },
  cargoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cargoNameBadge: {
    backgroundColor: 'rgba(11, 30, 66, 0.04)',
    borderRadius: 8,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cargoNameText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  cargoWeightBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cargoWeightText: {
    color: '#C2410C',
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cargoSubRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  specBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  loadingBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  loadingBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  vehicleTag: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vehicleTagText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },

  // Footer
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  priceEtaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  priceText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  updatedText: {
    color: '#94A3B8',
    fontSize: 11,
  },

  // Action Buttons
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  cardDeclineBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: 12,
  },
  cardDeclineText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  cardAcceptBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 12,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAcceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
