import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  leopardElevation,
  leopardPalette,
  leopardRadius,
  spacing,
  typography,
} from '../../theme/tokens';
import {
  IconCameraProof,
  IconMessage,
  IconPhone,
  IconQrPayment,
  IconRoleDriver,
} from '../../ui/icons/CoreIcons';
import { RealInteractiveMap } from '../../ui/RealInteractiveMap';

// ── Types ────────────────────────────────────────────────────────────

export type TrackingPoint = Readonly<{
  lat: number;
  lng: number;
  timestamp: string;
}>;

export type DriverInfo = Readonly<{
  name: string;
  avatar?: string;
  rating: number;
  totalTrips: number;
  phone: string;
  vehiclePlate: string;
  vehicleType: string;
  vehicleCapacity: string;
}>;

export type TripBookingDetails = Readonly<{
  bookingCode: string;
  origin: string;
  destination: string;
  cargoLabel: string;
  weightKg: number;
  priceVnd: string;
  distanceTotalKm: number;
  distanceRemainingKm: number;
  etaMinutes: number;
  etaLabel: string;
  status: 'LOADING' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';
  hasDeliveryProof: boolean;
}>;

export type RealtimeTrackingScreenProps = Readonly<{
  driver: DriverInfo;
  trip: TripBookingDetails;
  truckLocation?: TrackingPoint;
  onCallDriver?: () => void;
  onChatDriver?: () => void;
  onShowVietQR?: () => void;
  onViewDeliveryProof?: () => void;
  onBack?: () => void;
}>;

// ── Status Helpers ───────────────────────────────────────────────────

type TrackingStatusPresentation = Readonly<{
  label: string;
  bg: string;
  text: string;
  dot: string;
}>;

const TRACKING_STATUS: Record<TripBookingDetails['status'], TrackingStatusPresentation> = {
  LOADING: { label: 'Đang bốc hàng', bg: colors.warning.background, text: colors.warning.text, dot: colors.warning.border },
  IN_TRANSIT: { label: 'Đang vận chuyển', bg: colors.info.background, text: colors.info.text, dot: colors.brand.background },
  ARRIVED: { label: 'Đã đến nơi', bg: colors.success.background, text: colors.success.text, dot: colors.success.border },
  DELIVERED: { label: 'Hoàn thành giao', bg: colors.success.background, text: colors.success.text, dot: colors.success.border },
};

// ── Component ────────────────────────────────────────────────────────

export function RealtimeTrackingScreen({
  driver,
  onBack,
  onCallDriver,
  onChatDriver,
  onShowVietQR,
  onViewDeliveryProof,
  trip,
  truckLocation,
}: RealtimeTrackingScreenProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const statusPres = TRACKING_STATUS[trip.status];
  const progressPct = Math.max(
    0,
    Math.min(100, ((trip.distanceTotalKm - trip.distanceRemainingKm) / trip.distanceTotalKm) * 100),
  );

  return (
    <View style={styles.container}>
      {/* ── Top Half: Map Area ─────────────────────────────── */}
      <View style={styles.mapArea}>
        {/* Real Interactive Leaflet/GPS Map */}
        <View style={styles.mapCanvas}>
          <RealInteractiveMap
            destination={{ label: trip.destination }}
            height="100%"
            mode="tracking"
            origin={{ label: trip.origin }}
            truckEtaMinutes={trip.etaMinutes}
            truckLocation={
              truckLocation ? { lat: truckLocation.lat, lng: truckLocation.lng } : undefined
            }
          />
        </View>

        {/* Top overlay bar */}
        <View style={styles.mapTopBar}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Quay lại"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
          ) : null}
          <View style={[styles.statusTagOverlay, { backgroundColor: statusPres.bg }]}>
            <View style={[styles.statusDotOverlay, { backgroundColor: statusPres.dot }]} />
            <Text style={[styles.statusTextOverlay, { color: statusPres.text }]}>
              {statusPres.label}
            </Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* ── Bottom Sheet ──────────────────────────────────── */}
      <View style={styles.bottomSheet}>
        {/* Drag handle */}
        <Pressable
          accessibilityLabel={sheetExpanded ? 'Thu gọn' : 'Mở rộng'}
          accessibilityRole="button"
          onPress={() => setSheetExpanded(!sheetExpanded)}
          style={styles.handleWrap}
        >
          <View style={styles.dragHandle} />
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─ Section 1: Driver Info ────────────────────── */}
          <View style={styles.driverSection}>
            <View style={styles.driverInfoRow}>
              <View style={styles.driverAvatarBox}>
                <IconRoleDriver color={leopardPalette.primary} size={24} />
              </View>
              <View style={styles.driverTextCol}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.driverMetaRow}>
                  <Text style={styles.ratingText}>⭐ {driver.rating.toFixed(1)}</Text>
                  <Text style={styles.tripsText}>{driver.totalTrips} chuyến</Text>
                </View>
              </View>
            </View>

            <View style={styles.driverActions}>
              {onCallDriver ? (
                <Pressable
                  accessibilityLabel="Gọi điện tài xế"
                  accessibilityRole="button"
                  onPress={onCallDriver}
                  style={({ pressed }) => [styles.actionBtn, styles.callBtn, pressed ? styles.pressed : null]}
                >
                  <IconPhone color={leopardPalette.primary} size={16} />
                  <Text style={styles.callBtnText}>Gọi điện</Text>
                </Pressable>
              ) : null}
              {onChatDriver ? (
                <Pressable
                  accessibilityLabel="Nhắn tin tài xế"
                  accessibilityRole="button"
                  onPress={onChatDriver}
                  style={({ pressed }) => [styles.actionBtn, styles.chatBtn, pressed ? styles.pressed : null]}
                >
                  <IconMessage color={leopardPalette.textSlateDark} size={16} />
                  <Text style={styles.chatBtnText}>Nhắn tin</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          {/* ─ Section 2: Trip Progress ──────────────────── */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.sectionTitle}>Tiến trình giao hàng</Text>
              <Text style={styles.etaBadgeText}>
                ETA dự kiến: {trip.etaLabel}
              </Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
            </View>

            <View style={styles.progressLabelsRow}>
              <Text style={styles.progressLabelLeft}>
                {(trip.distanceTotalKm - trip.distanceRemainingKm).toFixed(1)} km đã đi
              </Text>
              <Text style={styles.progressLabelRight}>
                {trip.distanceRemainingKm.toFixed(1)} km còn lại
              </Text>
            </View>

            {/* Route summary */}
            <View style={styles.routeCompactRow}>
              <View style={styles.routeCompactDot} />
              <Text numberOfLines={1} style={styles.routeCompactText}>{trip.origin}</Text>
              <Text style={styles.routeArrow}>→</Text>
              <View style={[styles.routeCompactDot, styles.routeCompactDotGreen]} />
              <Text numberOfLines={1} style={styles.routeCompactText}>{trip.destination}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ─ Section 3: Booking Details ────────────────── */}
          <View style={styles.bookingSection}>
            <Text style={styles.sectionTitle}>Chi tiết chuyến</Text>

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Mã đơn</Text>
                <Text style={styles.detailValue}>{trip.bookingCode}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Biển số xe</Text>
                <Text style={styles.detailValue}>{driver.vehiclePlate}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Loại xe</Text>
                <Text style={styles.detailValue}>
                  {driver.vehicleType} ({driver.vehicleCapacity})
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Hàng hóa</Text>
                <Text style={styles.detailValue}>
                  {trip.cargoLabel} • {trip.weightKg} kg
                </Text>
              </View>
            </View>

            <View style={styles.pricingRow}>
              <View style={styles.pricingCol}>
                <Text style={styles.pricingLabel}>Tổng cước vận chuyển</Text>
                <Text style={styles.pricingValue}>{trip.priceVnd}</Text>
              </View>
              {onShowVietQR ? (
                <Pressable
                  accessibilityLabel="Hiện VietQR thanh toán"
                  accessibilityRole="button"
                  onPress={onShowVietQR}
                  style={({ pressed }) => [styles.vietQrBtn, pressed ? styles.pressed : null]}
                >
                  <IconQrPayment color="#FFFFFF" size={16} />
                  <Text style={styles.vietQrBtnText}>VietQR</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* ─ Section 4: Delivery Proof ─────────────────── */}
          {trip.hasDeliveryProof ? (
            <>
              <View style={styles.divider} />
              <View style={styles.proofSection}>
                <Text style={styles.sectionTitle}>Ảnh xác nhận giao hàng</Text>
                <Pressable
                  accessibilityLabel="Xem ảnh xác nhận giao hàng"
                  accessibilityRole="button"
                  onPress={onViewDeliveryProof}
                  style={({ pressed }) => [styles.proofThumbnailWrap, pressed ? styles.pressed : null]}
                >
                  <View style={styles.proofThumbnail}>
                    <IconCameraProof color={leopardPalette.primary} size={20} />
                    <Text style={styles.proofLabel}>Xem ảnh xác nhận</Text>
                  </View>
                  <View style={styles.proofVerifiedBadge}>
                    <Text style={styles.proofVerifiedText}>✓ Đã xác nhận</Text>
                  </View>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: leopardPalette.bgMuted,
  },

  // ── Map ──────────────────────────────────────────
  mapArea: {
    flex: 1,
    minHeight: 280,
    position: 'relative',
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.operational.mapLand,
    overflow: 'hidden',
  },
  mapTopBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: leopardRadius.md,
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...leopardElevation.subtle,
  },
  backIcon: {
    fontSize: 18,
    color: leopardPalette.textSlateDark,
  },
  statusTagOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: leopardRadius.pill,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    ...leopardElevation.subtle,
  },
  statusDotOverlay: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextOverlay: {
    fontSize: 11,
    fontWeight: '600',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: 1,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger.text,
  },
  liveText: {
    color: colors.danger.text,
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Bottom Sheet ──────────────────────────────────
  bottomSheet: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderTopLeftRadius: leopardRadius.xl,
    borderTopRightRadius: leopardRadius.xl,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    maxHeight: '58%',
    ...leopardElevation.modal,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: leopardPalette.cardBorder,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  driverAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: leopardRadius.md,
    backgroundColor: leopardPalette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: leopardPalette.primaryBorder,
  },
  driverTextCol: {
    flex: 1,
    gap: 1,
  },
  driverName: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '600',
  },
  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    ...typography.caption,
    color: colors.warning.text,
    fontWeight: '600',
  },
  tripsText: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
  },
  driverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: leopardRadius.md,
    borderWidth: 1,
  },
  callBtn: {
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primaryBorder,
  },
  callBtnText: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  chatBtn: {
    backgroundColor: leopardPalette.bgMuted,
    borderColor: leopardPalette.cardBorder,
  },
  chatBtnText: {
    color: leopardPalette.textSlateDark,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: leopardPalette.subtleDivider,
  },
  progressSection: {
    gap: spacing.xs,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '600',
  },
  etaBadgeText: {
    ...typography.caption,
    color: leopardPalette.primary,
    fontWeight: '600',
  },
  progressBarContainer: {
    paddingVertical: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: leopardPalette.bgMuted,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: leopardPalette.primary,
    borderRadius: 3,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelLeft: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
  },
  progressLabelRight: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
  },
  routeCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: leopardPalette.bgMuted,
    padding: spacing.xs,
    borderRadius: leopardRadius.sm,
  },
  routeCompactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: leopardPalette.primary,
  },
  routeCompactDotGreen: {
    backgroundColor: colors.success.border,
  },
  routeCompactText: {
    flex: 1,
    ...typography.caption,
    color: leopardPalette.textSlateDark,
    fontSize: 11.5,
  },
  routeArrow: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
  },
  bookingSection: {
    gap: spacing.xs,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailItem: {
    width: '48%',
    backgroundColor: leopardPalette.bgMuted,
    padding: spacing.xs,
    borderRadius: leopardRadius.sm,
    gap: 2,
  },
  detailLabel: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 10.5,
  },
  detailValue: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    fontSize: 12.5,
    fontWeight: '600',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: leopardPalette.subtleDivider,
  },
  pricingCol: {
    gap: 1,
  },
  pricingLabel: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
  },
  pricingValue: {
    color: leopardPalette.primary,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  vietQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: leopardPalette.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: leopardRadius.md,
  },
  vietQrBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  proofSection: {
    gap: spacing.xs,
  },
  proofThumbnailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: leopardPalette.bgMuted,
    borderRadius: leopardRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
  },
  proofThumbnail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  proofLabel: {
    ...typography.body,
    fontSize: 13,
    color: leopardPalette.textSlateDark,
    fontWeight: '500',
  },
  proofVerifiedBadge: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proofVerifiedText: {
    ...typography.caption,
    color: colors.success.text,
    fontSize: 11,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
