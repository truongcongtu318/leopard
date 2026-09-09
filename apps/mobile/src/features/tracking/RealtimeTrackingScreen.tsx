import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  layout,
  leopardElevation,
  leopardPalette,
  leopardRadius,
  radius,
  spacing,
  typography,
} from '../../theme/tokens';
import {
  IconCameraProof,
  IconLocationPin,
  IconMessage,
  IconPhone,
  IconQrPayment,
  IconRoleDriver,
  IconSpeedTruck,
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
  rating?: number;
  totalTrips?: number;
  phone?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  vehicleCapacity?: string;
}>;

export type TripBookingDetails = Readonly<{
  bookingCode: string;
  origin: string;
  originCoords?: { lat: number; lng: number };
  destination: string;
  destinationCoords?: { lat: number; lng: number };
  stops?: readonly { id: string; label: string; coords?: { lat: number; lng: number } }[];
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
  LOADING: {
    label: 'Đang bốc hàng',
    bg: colors.warning.background,
    text: colors.warning.text,
    dot: colors.warning.border,
  },
  IN_TRANSIT: {
    label: 'Đang vận chuyển',
    bg: colors.info.background,
    text: colors.info.text,
    dot: colors.brand.background,
  },
  ARRIVED: {
    label: 'Đã đến nơi',
    bg: colors.success.background,
    text: colors.success.text,
    dot: colors.success.border,
  },
  DELIVERED: {
    label: 'Hoàn thành giao',
    bg: colors.success.background,
    text: colors.success.text,
    dot: colors.success.border,
  },
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

  const handleCall = () => {
    if (onCallDriver) {
      onCallDriver();
      return;
    }
    const phone = driver.phone || '0901234567';
    void Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Gọi tài xế', `Số điện thoại tài xế: ${phone}`);
    });
  };

  const handleChat = () => {
    if (onChatDriver) {
      onChatDriver();
      return;
    }
    Alert.alert('Nhắn tin', `Nhắn tin trao đổi với tài xế ${driver.name}`);
  };

  return (
    <View style={styles.container}>
      {/* ── Top Half: Map Area ─────────────────────────────── */}
      <View style={styles.mapArea}>
        {/* Real Interactive Leaflet/GPS Map */}
        <View style={styles.mapCanvas}>
          <RealInteractiveMap
            destination={{ label: trip.destination, coords: trip.destinationCoords }}
            height="100%"
            mode="tracking"
            origin={{ label: trip.origin, coords: trip.originCoords }}
            stops={trip.stops}
            truckEtaLabel={trip.etaLabel}
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
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}

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
      <View style={[styles.bottomSheet, sheetExpanded && styles.bottomSheetExpanded]}>
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
          {/* ─ Section 1: Driver VIP Card ────────────────── */}
          <View style={styles.driverSection}>
            <View style={styles.driverInfoRow}>
              <View style={styles.driverAvatarBox}>
                <IconRoleDriver color="#0B1E42" size={24} />
                <View style={styles.driverVerifiedDot}>
                  <Text style={styles.driverVerifiedCheck}>✓</Text>
                </View>
              </View>

              <View style={styles.driverTextCol}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.driverMetaRow}>
                  {typeof driver.rating === 'number' ? (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>⭐ {driver.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                  {typeof driver.totalTrips === 'number' ? (
                    <Text style={styles.tripsText}>{driver.totalTrips} chuyến</Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.driverActions}>
              <Pressable
                accessibilityLabel="Gọi điện tài xế"
                accessibilityRole="button"
                onPress={handleCall}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.callBtn,
                  pressed ? styles.pressed : null,
                ]}
              >
                <IconPhone color="#FFFFFF" size={16} />
                <Text style={styles.callBtnText}>Gọi điện</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Nhắn tin tài xế"
                accessibilityRole="button"
                onPress={handleChat}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.chatBtn,
                  pressed ? styles.pressed : null,
                ]}
              >
                <IconMessage color="#1E293B" size={16} />
                <Text style={styles.chatBtnText}>Nhắn tin</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ─ Section 2: Trip Progress ──────────────────── */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.sectionTitle}>Tiến trình giao hàng</Text>
              <View style={styles.etaHeaderBadge}>
                <Text style={styles.etaBadgeText}>
                  Thời gian dự kiến: {trip.etaLabel}
                </Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
            </View>

            <View style={styles.progressLabelsRow}>
              <View style={styles.progressStatCol}>
                <Text style={styles.progressStatSub}>ĐÃ DI CHUYỂN</Text>
                <Text style={styles.progressLabelLeft}>
                  {(trip.distanceTotalKm - trip.distanceRemainingKm).toFixed(1)} km đã đi
                </Text>
              </View>
              <View style={[styles.progressStatCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.progressStatSub}>CÒN LẠI</Text>
                <Text style={styles.progressLabelRight}>
                  {trip.distanceRemainingKm.toFixed(1)} km còn lại
                </Text>
              </View>
            </View>

            {/* Route summary box */}
            <View style={styles.routeCompactCard}>
              <View style={styles.routeCompactRow}>
                <View style={[styles.routeCompactDot, styles.routeDotOrigin]} />
                <Text numberOfLines={1} style={styles.routeCompactText}>{trip.origin}</Text>
              </View>
              <View style={styles.routeConnectorLine} />
              <View style={styles.routeCompactRow}>
                <View style={[styles.routeCompactDot, styles.routeDotDest]} />
                <Text numberOfLines={1} style={styles.routeCompactText}>{trip.destination}</Text>
              </View>
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
              {driver.vehiclePlate ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Biển số xe</Text>
                  <Text style={styles.detailValue}>{driver.vehiclePlate}</Text>
                </View>
              ) : null}
              {driver.vehicleType ? (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Loại xe</Text>
                  <Text style={styles.detailValue}>
                    {driver.vehicleType}
                    {driver.vehicleCapacity ? ` (${driver.vehicleCapacity})` : ''}
                  </Text>
                </View>
              ) : null}
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
                <View style={styles.sectionHeaderBetween}>
                  <Text style={styles.sectionTitle}>Ảnh xác nhận giao hàng</Text>
                  <View style={styles.proofVerifiedBadge}>
                    <Text style={styles.proofVerifiedText}>✓ Đã xác nhận</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Xem ảnh xác nhận giao hàng"
                  accessibilityRole="button"
                  onPress={onViewDeliveryProof}
                  style={({ pressed }) => [
                    styles.proofThumbnailWrap,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.proofThumbnail}>
                    <View style={styles.proofIconBox}>
                      <IconCameraProof color="#0B1E42" size={20} />
                    </View>
                    <View style={styles.proofTextWrap}>
                      <Text style={styles.proofLabel}>Xem ảnh xác nhận giao hàng</Text>
                      <Text style={styles.proofSubLabel}>Minh chứng đã ký nhận thực tế</Text>
                    </View>
                  </View>
                  <Text style={styles.proofArrow}>➔</Text>
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
    backgroundColor: '#F8FAFC',
  },

  // ── Map Area ─────────────────────────────────────
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
    backgroundColor: '#F1F5F9',
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
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  backIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusTagOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statusDotOverlay: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextOverlay: {
    fontSize: 12,
    fontWeight: '700',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  floatingEtaCard: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  floatingEtaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingEtaTextWrap: {
    gap: 1,
  },
  floatingEtaSub: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  floatingEtaVal: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Bottom Sheet ──────────────────────────────────
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: -18,
    zIndex: 5,
    maxHeight: '58%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomSheetExpanded: {
    maxHeight: '82%',
  },
  handleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
    gap: 14,
  },

  // ── Driver Section ────────────────────────────────
  driverSection: {
    gap: 12,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  driverVerifiedDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverVerifiedCheck: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  driverTextCol: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  ratingText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  tripsText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  plateBadgeMini: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  plateTextMini: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  driverActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  callBtn: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chatBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  chatBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Progress Section ──────────────────────────────
  progressSection: {
    gap: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaHeaderBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  etaBadgeText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#0B1E42',
  },
  progressLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStatCol: {
    gap: 1,
  },
  progressStatSub: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  progressLabelLeft: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  progressLabelRight: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '700',
  },
  routeCompactCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  routeCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeCompactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeDotOrigin: {
    backgroundColor: '#10B981',
  },
  routeDotDest: {
    backgroundColor: '#EF4444',
  },
  routeConnectorLine: {
    width: 1.5,
    height: 8,
    backgroundColor: '#CBD5E1',
    marginLeft: 3.25,
  },
  routeCompactText: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },

  // ── Booking Section ───────────────────────────────
  bookingSection: {
    gap: 10,
  },
  bookingCodeBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bookingCodeText: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  detailGrid: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  pricingCol: {
    gap: 1,
  },
  pricingLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  pricingValue: {
    color: '#0B1E42',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  vietQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0B1E42',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  vietQrBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Delivery Proof ────────────────────────────────
  proofSection: {
    gap: 10,
  },
  proofThumbnailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  proofThumbnail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proofIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofTextWrap: {
    gap: 2,
  },
  proofLabel: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  proofSubLabel: {
    color: '#16A34A',
    fontSize: 11,
  },
  proofVerifiedBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proofVerifiedText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  proofArrow: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Utilities ─────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  pressed: {
    opacity: 0.85,
  },
});
