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
  customerPalette,
  leopardPalette,
  pastelTheme,
  spacing,
  IconCameraProof,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconMessage,
  IconPhone,
  IconQrPayment,
  IconRoleDriver,
  IconSpeedTruck,
  IconStar,
  RealInteractiveMap,
  typeScale,
} from '@leopard/mobile-core';
import { VietQRPaymentModal } from '../customer/orders/components/VietQRPaymentModal';

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
  onViewInvoice?: () => void;
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
  onViewInvoice,
  trip,
  truckLocation,
}: RealtimeTrackingScreenProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [internalQrModalVisible, setInternalQrModalVisible] = useState(false);
  const statusPres = TRACKING_STATUS[trip.status];
  const progressPct = Math.max(
    0,
    Math.min(100, ((trip.distanceTotalKm - trip.distanceRemainingKm) / trip.distanceTotalKm) * 100),
  );

  const rawPhone = driver.phone || '0901234567';
  const maskedPhone =
    rawPhone.length >= 7
      ? `${rawPhone.slice(0, 4)} *** ${rawPhone.slice(-3)}`
      : rawPhone;

  const formattedRating =
    typeof driver.rating === 'number'
      ? Number.isInteger(driver.rating * 10)
        ? driver.rating.toFixed(1)
        : driver.rating.toFixed(2)
      : null;

  const handleCall = () => {
    if (onCallDriver) {
      onCallDriver();
      return;
    }
    void Linking.openURL(`tel:${rawPhone}`).catch(() => {
      Alert.alert('Gọi tài xế', `Số điện thoại tài xế: ${maskedPhone}`);
    });
  };

  const handleChat = () => {
    if (onChatDriver) {
      onChatDriver();
      return;
    }
    Alert.alert('Nhắn tin', `Nhắn tin trao đổi với tài xế ${driver.name}`);
  };

  const handleOpenVietQR = () => {
    if (onShowVietQR) {
      onShowVietQR();
    } else {
      setInternalQrModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── LAYER 0: 100% Viewport Dark GIS Map ─────────────── */}
      <View pointerEvents="box-none" style={styles.mapArea} testID="realtime-map-area">
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
      </View>

      {/* ── LAYER 1: Floating Header & Fixed Status Bar ────── */}
      <View pointerEvents="box-none" style={styles.topBarContainer}>
        {/* Top bar controls */}
        <View style={styles.mapTopBar}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Quay lại"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}
            >
              <IconChevronLeft color={colors.neutral.text} size={20} strokeWidth={2} />
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

        {/* Fixed Status Bar: Strictly "ETA dự kiến", Tabular Nums */}
        <View style={styles.fixedStatusBar}>
          <View style={styles.fixedStatusIconBox}>
            <IconSpeedTruck color={customerPalette.primary} size={16} strokeWidth={2} />
          </View>
          <Text style={styles.fixedStatusText}>
            {`ETA dự kiến: ${trip.etaLabel} · Còn ${trip.distanceRemainingKm.toFixed(1)} km`}
          </Text>
        </View>
      </View>

      {/* ── LAYER 2: Gesture Bottom Sheet ──────────────────── */}
      <View style={[styles.bottomSheet, sheetExpanded && styles.bottomSheetExpanded]}>
        {/* Drag handle (>= 44px touch target) */}
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
          {/* ─ Floating VIP Driver Card (Double-Bezel: 24px outer, 18px inner) ── */}
          <View style={styles.vipDriverCardOuter}>
            <View style={styles.vipDriverCardInner}>
              <View style={styles.driverInfoRow}>
                <View style={styles.driverAvatarBox}>
                  <IconRoleDriver color={customerPalette.primary} size={24} />
                  <View style={styles.driverVerifiedDot}>
                    <IconCheck color={colors.neutral.surface} size={10} strokeWidth={2.5} />
                  </View>
                </View>

                <View style={styles.driverTextCol}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <View style={styles.driverMetaRow}>
                    {driver.vehiclePlate ? (
                      <View style={styles.plateBadgeMini}>
                        <Text style={styles.plateTextMini}>{driver.vehiclePlate}</Text>
                      </View>
                    ) : null}
                    {formattedRating ? (
                      <View style={styles.ratingBadge}>
                        <IconStar color={pastelTheme.yellowCard.accent} fill={pastelTheme.yellowCard.accent} size={13} strokeWidth={1.8} />
                        <Text style={styles.ratingText}>{formattedRating}</Text>
                      </View>
                    ) : null}
                    {typeof driver.totalTrips === 'number' ? (
                      <Text style={styles.tripsText}>{driver.totalTrips} chuyến</Text>
                    ) : null}
                    <Text style={styles.driverPhoneMasked}>{maskedPhone}</Text>
                  </View>
                </View>
              </View>

              {/* VIP Driver Action Buttons (Touch targets >= 44x44px) */}
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
                  <IconPhone color={colors.neutral.surface} size={16} strokeWidth={2} />
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
                  <IconMessage color={colors.neutral.text} size={16} strokeWidth={2} />
                  <Text style={styles.chatBtnText}>Nhắn tin</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ─ Cargo Details Card (Double-Bezel: 24px outer hairline, 18px inner) ── */}
          <View style={styles.cargoCardOuter}>
            <View style={styles.cargoCardInner}>
              {/* Trip Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeaderRow}>
                  <Text style={styles.sectionTitle}>Tiến trình giao hàng</Text>
                  <View style={styles.etaHeaderBadge}>
                    <Text style={styles.etaBadgeText}>
                      ETA dự kiến: {trip.etaLabel}
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

                {/* Route compact box */}
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

              {/* Booking & Cargo Details */}
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
                      onPress={handleOpenVietQR}
                      style={({ pressed }) => [styles.vietQrBtn, pressed ? styles.pressed : null]}
                    >
                      <IconQrPayment color={colors.neutral.surface} size={16} strokeWidth={2} />
                      <Text style={styles.vietQrBtnText}>VietQR</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Electronic VAT Invoice Shortcut */}
              <View style={styles.divider} />
              <View style={styles.invoiceSection}>
                <View style={styles.invoiceHeaderRow}>
                  <View style={styles.invoiceTitleWrap}>
                    <IconFileText color={colors.warning.text} size={18} strokeWidth={2} />
                    <View>
                      <Text style={styles.sectionTitle}>Hóa đơn điện tử VAT 8%</Text>
                      <Text style={styles.invoiceSubTitle}>Tuân thủ Nghị định 123 & Thông tư 78</Text>
                    </View>
                  </View>
                  <View style={styles.vatRatePill}>
                    <Text style={styles.vatRatePillText}>VAT 8%</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityLabel="Tải hóa đơn VAT"
                  accessibilityRole="button"
                  onPress={onViewInvoice}
                  style={({ pressed }) => [
                    styles.invoiceDownloadBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.invoiceDownloadLeft}>
                    <View style={styles.invoicePdfIconBox}>
                      <Text style={styles.invoicePdfIconText}>PDF</Text>
                    </View>
                    <View style={styles.invoiceDownloadTextWrap}>
                      <Text style={styles.invoiceDownloadLabel}>Tải hóa đơn VAT</Text>
                      <Text style={styles.invoiceDownloadSubLabel}>Xem và lưu trữ chứng từ hợp lệ</Text>
                    </View>
                  </View>
                  <IconChevronRight color={customerPalette.primary} size={18} strokeWidth={2} />
                </Pressable>
              </View>

              {/* Delivery Proof */}
              {trip.hasDeliveryProof ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.proofSection}>
                    <View style={styles.sectionHeaderBetween}>
                      <Text style={styles.sectionTitle}>Ảnh xác nhận giao hàng</Text>
                      <View style={styles.proofVerifiedBadge}>
                        <IconCheck color={colors.success.text} size={12} strokeWidth={2.5} />
                        <Text style={styles.proofVerifiedText}>Đã xác nhận</Text>
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
                          <IconCameraProof color={customerPalette.primary} size={20} strokeWidth={2} />
                        </View>
                        <View style={styles.proofTextWrap}>
                          <Text style={styles.proofLabel}>Xem ảnh xác nhận giao hàng</Text>
                          <Text style={styles.proofSubLabel}>Minh chứng đã ký nhận thực tế</Text>
                        </View>
                      </View>
                      <IconChevronRight color={colors.success.text} size={18} strokeWidth={2} />
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Dynamic VietQR Payment Modal */}
      <VietQRPaymentModal
        amount={
          parseInt(trip.priceVnd.replace(/[^0-9]/g, ''), 10) || 850000
        }
        amountLabel={trip.priceVnd}
        onClose={() => setInternalQrModalVisible(false)}
        onPaymentSuccess={() => {
          setInternalQrModalVisible(false);
          Alert.alert('Thanh toán thành công', 'Hệ thống đã tự động gạch nợ thành công qua payOS.');
        }}
        orderReference={trip.bookingCode}
        visible={internalQrModalVisible}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customerPalette.textSlateDark,
    position: 'relative',
  },

  // ── LAYER 0: Map Area ─────────────────────────────
  mapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: customerPalette.textSlateDark,
    overflow: 'hidden',
  },

  // ── LAYER 1: Top Bar & Fixed Status ───────────────
  topBarContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
    gap: 8,
  },
  mapTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  statusTagOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: customerPalette.surfaceWhite,
    shadowColor: customerPalette.primary,
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
    backgroundColor: colors.danger.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.danger.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: customerPalette.surfaceWhite,
  },
  liveText: {
    color: customerPalette.surfaceWhite,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Fixed Status Bar (Strict "ETA dự kiến", Tabular Nums)
  fixedStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    gap: 8,
  },
  fixedStatusIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.info.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },

  // ── LAYER 2: Bottom Sheet ─────────────────────────
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.98)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    zIndex: 40,
    maxHeight: '56%',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomSheetExpanded: {
    maxHeight: '86%',
  },
  handleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: leopardPalette.inputBorder,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
    gap: 12,
  },

  // ── VIP Driver Card (Double-Bezel: 24px outer, 18px inner) ──
  vipDriverCardOuter: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: customerPalette.surfaceWhite,
    padding: 12,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  vipDriverCardInner: {
    borderRadius: 18,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: 12,
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
    backgroundColor: colors.info.background,
    borderWidth: 1.5,
    borderColor: leopardPalette.inputBorder,
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
    backgroundColor: colors.success.text,
    borderWidth: 1.5,
    borderColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTextCol: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    color: customerPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '700',
  },
  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  plateBadgeMini: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: leopardPalette.inputBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plateTextMini: {
    color: customerPalette.textSlateDark,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warning.background,
    borderColor: pastelTheme.yellowCard.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: colors.warning.text,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tripsText: {
    color: customerPalette.textSubtle,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  driverPhoneMasked: {
    color: colors.brand.blue,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
    backgroundColor: colors.info.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  callBtn: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  callBtnText: {
    color: customerPalette.surfaceWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  chatBtn: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: leopardPalette.inputBorder,
  },
  chatBtnText: {
    color: customerPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Cargo Details Card (Double-Bezel: 24px outer, 18px inner) ──
  cargoCardOuter: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: customerPalette.surfaceWhite,
    padding: 14,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  cargoCardInner: {
    borderRadius: 18,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: 14,
    gap: 14,
  },

  // Progress Section
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
    color: customerPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaHeaderBadge: {
    backgroundColor: colors.info.background,
    borderColor: leopardPalette.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  etaBadgeText: {
    color: customerPalette.primary,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: customerPalette.cardBorder,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: customerPalette.primary,
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
    color: leopardPalette.inputPlaceholder,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  progressLabelLeft: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressLabelRight: {
    color: customerPalette.primary,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  routeCompactCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
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
    backgroundColor: colors.success.text,
  },
  routeDotDest: {
    backgroundColor: colors.danger.text,
  },
  routeConnectorLine: {
    width: 1.5,
    height: 8,
    backgroundColor: leopardPalette.inputBorder,
    marginLeft: 3.25,
  },
  routeCompactText: {
    color: '#334155',
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '500',
    flex: 1,
  },

  // Booking details
  bookingSection: {
    gap: 10,
  },
  detailGrid: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
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
    color: customerPalette.textSubtle,
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    color: customerPalette.textSlateDark,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
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
    color: customerPalette.textSubtle,
    fontSize: 11,
    fontWeight: '500',
  },
  pricingValue: {
    color: customerPalette.primary,
    fontSize: typeScale.body.fontSize,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  vietQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: customerPalette.primary,
    borderRadius: 12,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  vietQrBtnText: {
    color: customerPalette.surfaceWhite,
    fontSize: 12,
    fontWeight: '700',
  },

  // Invoice Section
  invoiceSection: {
    gap: 10,
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceSubTitle: {
    color: customerPalette.textSubtle,
    fontSize: 11,
    marginTop: 1,
  },
  vatRatePill: {
    backgroundColor: colors.warning.background,
    borderColor: pastelTheme.yellowCard.accent,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vatRatePillText: {
    color: colors.warning.text,
    fontSize: 11,
    fontWeight: '800',
  },
  invoiceDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  invoiceDownloadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoicePdfIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.danger.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicePdfIconText: {
    color: customerPalette.surfaceWhite,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '900',
  },
  invoiceDownloadTextWrap: {
    gap: 2,
  },
  invoiceDownloadLabel: {
    color: customerPalette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceDownloadSubLabel: {
    color: customerPalette.textSubtle,
    fontSize: 11,
  },

  // Delivery Proof Section
  proofSection: {
    gap: 10,
  },
  proofThumbnailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: leopardPalette.ecoGreenBg,
    borderColor: leopardPalette.ecoGreenBorder,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    backgroundColor: colors.success.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofTextWrap: {
    gap: 2,
  },
  proofLabel: {
    color: colors.success.text,
    fontSize: 13,
    fontWeight: '700',
  },
  proofSubLabel: {
    color: colors.brand.green,
    fontSize: 11,
  },
  proofVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proofVerifiedText: {
    color: colors.success.text,
    fontSize: 11,
    fontWeight: '700',
  },

  // Utilities
  divider: {
    height: 1,
    backgroundColor: customerPalette.cardBorder,
  },
  pressed: {
    opacity: 0.85,
  },
});
