import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  IconCameraProof,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconMessage,
  IconPhone,
  IconPin,
  IconQrPayment,
  IconRoleDriver,
  IconSpeedTruck,
  IconStar,
  LeopardMapView,
  anchorRouteToTruck,
  calculateBearing,
  calculateDynamicVisibleCenterOffset,
  colors,
  control,
  customerPalette,
  fetchStreetRoute,
  haptic,
  iosContinuousCurve,
  leopardPalette,
  lerpCoordinate,
  pastelTheme,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { VietQRPaymentModal } from '../customer/orders/components/VietQRPaymentModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type SnapPoint = 'MINI' | 'HALF' | 'FULL';

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
  status:
    | 'ACCEPTED'
    | 'PICKING_UP'
    | 'LOADING'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'RETURNING'
    | 'DELIVERED';
  hasDeliveryProof: boolean;
  isSimulated?: boolean;
  isDemo?: boolean;
  routeCoords?: readonly { lat: number; lng: number }[];
}>;

export type RealtimeTrackingScreenProps = Readonly<{
  driver: DriverInfo;
  trip: TripBookingDetails;
  truckLocation?: TrackingPoint;
  isSimulatedData?: boolean;
  onCallDriver?: () => void;
  onChatDriver?: () => void;
  onShowVietQR?: () => void;
  onViewDeliveryProof?: () => void;
  onViewInvoice?: () => void;
  onReviewTrip?: () => void;
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
  ACCEPTED: {
    label: 'Tài xế đã nhận đơn',
    bg: colors.info.background,
    text: colors.info.text,
    dot: colors.brand.background,
  },
  PICKING_UP: {
    label: 'Đang đến lấy hàng',
    bg: colors.info.background,
    text: colors.info.text,
    dot: colors.brand.background,
  },
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
  RETURNING: {
    label: 'Đang hoàn hàng',
    bg: colors.danger.background,
    text: colors.danger.text,
    dot: colors.danger.border,
  },
  DELIVERED: {
    label: 'Hoàn thành giao',
    bg: colors.success.background,
    text: colors.success.text,
    dot: colors.success.border,
  },
};

// ── Memoized Map Layer ──────────────────────────────────────────────

type TrackingMapLayerProps = Readonly<{
  origin: string;
  originCoords?: { lat: number; lng: number };
  destination: string;
  destinationCoords?: { lat: number; lng: number };
  stops?: readonly { id: string; label: string; coords?: { lat: number; lng: number } }[];
  truckLocation?: TrackingPoint;
  truckEtaLabel: string;
  truckEtaMinutes: number;
  routeCoords?: readonly { lat: number; lng: number }[];
  snapPoint?: SnapPoint;
  distanceRemainingKm?: number;
  distanceTotalKm?: number;
  status?: TripBookingDetails['status'];
}>;

const TrackingMapLayer = React.memo(function TrackingMapLayer({
  destination,
  destinationCoords,
  distanceRemainingKm,
  distanceTotalKm,
  origin,
  originCoords,
  routeCoords,
  snapPoint = 'MINI',
  status,
  stops,
  truckEtaLabel,
  truckEtaMinutes,
  truckLocation,
}: TrackingMapLayerProps) {
  const { height: screenHeight } = useWindowDimensions();

  const isPickupLeg =
    status === 'ACCEPTED' || status === 'PICKING_UP' || status === 'LOADING';

  // Stable object references to avoid re-triggering polyline recalculations
  const memoizedOrigin = useMemo(
    () => ({ label: origin, coords: originCoords }),
    [origin, originCoords?.lat, originCoords?.lng],
  );

  const memoizedDestination = useMemo(
    () => ({ label: destination, coords: destinationCoords }),
    [destination, destinationCoords?.lat, destinationCoords?.lng],
  );

  const memoizedTruckLocation = useMemo(
    () => (truckLocation ? { lat: truckLocation.lat, lng: truckLocation.lng } : undefined),
    [truckLocation?.lat, truckLocation?.lng],
  );

  // When live GPS fix has not arrived yet, interpolate estimated vehicle along the route
  const effectiveTruckLocation = useMemo(() => {
    if (memoizedTruckLocation) return memoizedTruckLocation;
    if (!routeCoords || routeCoords.length < 2) return originCoords;
    const totalKm = distanceTotalKm || 1;
    const remainingKm = Math.min(distanceRemainingKm ?? totalKm, totalKm);
    const progress = Math.max(0, Math.min(1, 1 - remainingKm / totalKm));
    const targetIndexFloat = progress * (routeCoords.length - 1);
    const baseIndex = Math.floor(targetIndexFloat);
    const t = targetIndexFloat - baseIndex;
    const p1 = routeCoords[baseIndex];
    const p2 = routeCoords[Math.min(baseIndex + 1, routeCoords.length - 1)];
    return lerpCoordinate(p1, p2, t);
  }, [memoizedTruckLocation, routeCoords, originCoords, distanceRemainingKm, distanceTotalKm]);

  const [pickupRoute, setPickupRoute] = useState<readonly { lat: number; lng: number }[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isPickupLeg || !effectiveTruckLocation || !originCoords) {
      setPickupRoute(null);
      return;
    }

    void fetchStreetRoute(effectiveTruckLocation, originCoords, {
      vietmapApiKey: process.env.EXPO_PUBLIC_VIETMAP_API_KEY,
      vehicle: 'truck',
    }).then((res) => {
      if (!isMounted) return;
      if (res && res.coordinates.length >= 2) {
        setPickupRoute(res.coordinates);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    isPickupLeg,
    effectiveTruckLocation?.lat,
    effectiveTruckLocation?.lng,
    originCoords?.lat,
    originCoords?.lng,
  ]);

  // Seamlessly anchors the route to the vehicle's position (zero gap)
  const effectiveRouteCoords = useMemo(() => {
    if (isPickupLeg) {
      return anchorRouteToTruck({
        routeCoords: pickupRoute ?? [],
        truckLocation: effectiveTruckLocation,
        originCoords,
        destinationCoords,
        isPickupLeg: true,
      });
    }

    return anchorRouteToTruck({
      routeCoords,
      truckLocation: effectiveTruckLocation,
      originCoords,
      destinationCoords,
      isPickupLeg: false,
    });
  }, [isPickupLeg, pickupRoute, routeCoords, effectiveTruckLocation, originCoords, destinationCoords]);

  const bearing = useMemo(() => {
    if (isPickupLeg) {
      if (effectiveRouteCoords && effectiveRouteCoords.length >= 2) {
        return calculateBearing(effectiveRouteCoords[0], effectiveRouteCoords[1]);
      }
      if (effectiveTruckLocation && originCoords) {
        return calculateBearing(effectiveTruckLocation, originCoords);
      }
    }
    if (effectiveRouteCoords && effectiveRouteCoords.length >= 2) {
      return calculateBearing(effectiveRouteCoords[0], effectiveRouteCoords[1]);
    }
    if (!routeCoords || routeCoords.length < 2) return 0;
    const totalKm = distanceTotalKm || 1;
    const remainingKm = Math.min(distanceRemainingKm ?? totalKm, totalKm);
    const progress = Math.max(0, Math.min(1, 1 - remainingKm / totalKm));
    const targetIndexFloat = progress * (routeCoords.length - 1);
    const baseIndex = Math.min(Math.floor(targetIndexFloat), routeCoords.length - 2);
    return calculateBearing(routeCoords[baseIndex], routeCoords[baseIndex + 1]);
  }, [isPickupLeg, effectiveTruckLocation, originCoords, effectiveRouteCoords, routeCoords, distanceRemainingKm, distanceTotalKm]);

  const sheetHeight =
    snapPoint === 'FULL' ? screenHeight * 0.85 : snapPoint === 'HALF' ? 420 : 210;
  const offsetY = calculateDynamicVisibleCenterOffset(screenHeight, sheetHeight, 90);

  return (
    <View pointerEvents="box-none" style={styles.mapArea} testID="realtime-map-area">
      <View
        style={[
          styles.mapCanvas,
          offsetY !== 0
            ? {
                transform: [{ translateY: offsetY }],
                bottom: -Math.abs(offsetY) * 2,
              }
            : null,
        ]}
      >
        <LeopardMapView
          bearing={bearing}
          destination={memoizedDestination}
          followTruckLocation={true}
          height="100%"
          isPickupLeg={isPickupLeg}
          mode="tracking"
          origin={memoizedOrigin}
          routeCoords={effectiveRouteCoords}
          stops={stops}
          truckEtaLabel={truckEtaLabel}
          truckEtaMinutes={truckEtaMinutes}
          truckLocation={effectiveTruckLocation}
        />
      </View>
    </View>
  );
});

// ── Memoized Top Bar with Dynamic Island Floating ETA Pill ──────────

type TrackingTopBarProps = Readonly<{
  status: TripBookingDetails['status'];
  etaLabel: string;
  distanceRemainingKm: number;
  isSimulated: boolean;
  onBack?: () => void;
}>;

const TrackingTopBar = React.memo(function TrackingTopBar({
  distanceRemainingKm,
  etaLabel,
  isSimulated,
  onBack,
  status,
}: TrackingTopBarProps) {
  const statusPres = TRACKING_STATUS[status];

  const handleBackPress = () => {
    haptic.light();
    onBack?.();
  };

  return (
    <View pointerEvents="box-none" style={styles.topBarContainer}>
      {/* Top Bar Floating Controls */}
      <View style={styles.mapTopBar}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            onPress={handleBackPress}
            style={({ pressed }) => [styles.backBtn, pressed && styles.controlBtnPressed]}
          >
            <IconChevronLeft color={customerPalette.primary} size={20} strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <View style={styles.topBarRightBadges}>
          {isSimulated ? (
            <View style={styles.demoBadge} testID="badge-demo-data">
              <Text style={styles.demoBadgeText}>Dữ liệu mô phỏng</Text>
            </View>
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

      {/* Floating Dynamic Island Capsule: ETA dự kiến */}
      <View style={styles.fixedStatusBar}>
        <View style={styles.fixedStatusIconBox}>
          <IconSpeedTruck color={customerPalette.primary} size={16} strokeWidth={2.2} />
        </View>
        <Text style={styles.fixedStatusText}>
          {`ETA dự kiến: ${etaLabel} · Còn ${distanceRemainingKm.toFixed(1)} km`}
        </Text>
      </View>
    </View>
  );
});

// ── Locate SVG Glyph (Apple Maps Crosshair) ──────────────────────────

function IconLocateGlyph({ color = customerPalette.primary, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="12" cy="12" r="7" stroke={color} strokeWidth={2} />
      <Path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke={color} strokeLinecap="round" strokeWidth={2} />
      <Circle cx="12" cy="12" fill={color} r="2.5" />
    </Svg>
  );
}

// ── Floating Action Controls (Apple Maps Glass Controls) ─────────────

type FloatingActionControlsProps = Readonly<{
  onLocate: () => void;
  onSos: () => void;
  snapPoint: SnapPoint;
}>;

const FloatingActionControls = React.memo(function FloatingActionControls({
  onLocate,
  onSos,
  snapPoint,
}: FloatingActionControlsProps) {
  const bottomOffset =
    snapPoint === 'FULL' ? 140 : snapPoint === 'MINI' ? 225 : 445;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.floatingControlsStack, { bottom: bottomOffset }]}
    >
      {/* Re-center / Locate Button */}
      <Pressable
        accessibilityLabel="Định vị lại lộ trình"
        accessibilityRole="button"
        onPress={onLocate}
        style={({ pressed }) => [
          styles.floatingControlBtn,
          styles.locateBtn,
          pressed && styles.floatingBtnPressed,
        ]}
      >
        <IconLocateGlyph color={customerPalette.primary} size={20} />
      </Pressable>

      {/* SOS Button */}
      <Pressable
        accessibilityLabel="Hỗ trợ khẩn cấp SOS"
        accessibilityRole="button"
        onPress={onSos}
        style={({ pressed }) => [
          styles.floatingControlBtn,
          styles.sosBtn,
          pressed && styles.floatingBtnPressed,
        ]}
      >
        <Text style={styles.sosBtnText}>SOS</Text>
      </Pressable>
    </View>
  );
});

// ── Memoized VIP Driver Card (Apple HIG Inset Grouped) ───────────────

type VipDriverCardProps = Readonly<{
  driver: DriverInfo;
  maskedPhone: string;
  formattedRating: string | null;
  onCall: () => void;
  onChat: () => void;
  onToggleDetails?: () => void;
  isExpanded?: boolean;
}>;

const VipDriverCard = React.memo(function VipDriverCard({
  driver,
  formattedRating,
  isExpanded,
  maskedPhone,
  onCall,
  onChat,
  onToggleDetails,
}: VipDriverCardProps) {
  return (
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
                  <IconStar
                    color={customerPalette.accent}
                    fill={customerPalette.accent}
                    size={13}
                    strokeWidth={1.8}
                  />
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

        {/* Action Buttons: Micro-interactions with active scale 0.97 */}
        <View style={styles.driverActions}>
          <Pressable
            accessibilityLabel="Gọi điện tài xế"
            accessibilityRole="button"
            onPress={onCall}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.callBtn,
              pressed && styles.actionBtnPressed,
            ]}
          >
            <IconPhone color={colors.neutral.surface} size={16} strokeWidth={2} />
            <Text style={styles.callBtnText}>Gọi điện</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Nhắn tin tài xế"
            accessibilityRole="button"
            onPress={onChat}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.chatBtn,
              pressed && styles.actionBtnPressed,
            ]}
          >
            <IconMessage color={customerPalette.primary} size={16} strokeWidth={2} />
            <Text style={styles.chatBtnText}>Nhắn tin</Text>
          </Pressable>

          {onToggleDetails ? (
            <Pressable
              accessibilityLabel={isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết đơn hàng'}
              accessibilityRole="button"
              onPress={onToggleDetails}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.detailsBtn,
                pressed && styles.actionBtnPressed,
              ]}
            >
              <IconFileText color={customerPalette.primary} size={16} strokeWidth={2} />
              <Text style={styles.detailsBtnText}>
                {isExpanded ? 'Thu gọn' : 'Chi tiết'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

// ── Memoized Cargo & Booking Card with 3-Stage Timeline ──────────────

type CargoBookingCardProps = Readonly<{
  trip: TripBookingDetails;
  driverPlate?: string;
  driverType?: string;
  driverCapacity?: string;
  progressPct: number;
  onShowVietQR?: () => void;
  onViewInvoice?: () => void;
  onViewDeliveryProof?: () => void;
  onReviewTrip?: () => void;
}>;

const CargoBookingCard = React.memo(function CargoBookingCard({
  driverCapacity,
  driverPlate,
  driverType,
  onReviewTrip,
  onShowVietQR,
  onViewDeliveryProof,
  onViewInvoice,
  progressPct,
  trip,
}: CargoBookingCardProps) {
  const distanceTraveled = Math.max(0, trip.distanceTotalKm - trip.distanceRemainingKm).toFixed(1);

  return (
    <View style={styles.cargoCardOuter}>
      <View style={styles.cargoCardInner}>
        {/* Progress & Route Timeline Section */}
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
              <Text style={styles.progressStatSub}>Đã di chuyển</Text>
              <Text style={styles.progressLabelLeft}>
                {distanceTraveled} km đã đi
              </Text>
            </View>
            <View style={[styles.progressStatCol, styles.statAlignEnd]}>
              <Text style={styles.progressStatSub}>Còn lại</Text>
              <Text style={styles.progressLabelRight}>
                {trip.distanceRemainingKm.toFixed(1)} km còn lại
              </Text>
            </View>
          </View>

          {/* 3-Step Timeline: Lấy hàng -> Đang giao -> Đã giao */}
          <View style={styles.timelineBox}>
            {/* Step 1: Lấy hàng */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineNodeCol}>
                <View style={[styles.timelineDot, styles.dotDone]}>
                  <IconCheck color="#FFFFFF" size={9} strokeWidth={3} />
                </View>
                <View style={styles.timelineHairline} />
              </View>
              <View style={styles.timelineTextCol}>
                <View style={styles.timelineTitleRow}>
                  <Text style={styles.timelineStepLabel}>Lấy hàng</Text>
                  <Text style={styles.timelineSubBadge}>Đã hoàn tất</Text>
                </View>
                <Text numberOfLines={1} style={styles.timelineAddressText}>
                  {trip.origin}
                </Text>
              </View>
            </View>

            {/* Step 2: Đang giao */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineNodeCol}>
                <View style={[styles.timelineDot, styles.dotActive]}>
                  <IconSpeedTruck color="#FFFFFF" size={11} strokeWidth={2} />
                </View>
                <View style={styles.timelineHairline} />
              </View>
              <View style={styles.timelineTextCol}>
                <View style={styles.timelineTitleRow}>
                  <Text style={styles.timelineStepLabelActive}>Đang giao</Text>
                  <Text style={styles.timelineSubBadgeActive}>LIVE GPS</Text>
                </View>
                <Text numberOfLines={1} style={styles.timelineAddressText}>
                  Xe đang di chuyển đến điểm giao
                </Text>
              </View>
            </View>

            {/* Step 3: Đã giao */}
            <View style={styles.timelineItemLast}>
              <View style={styles.timelineNodeCol}>
                <View
                  style={[
                    styles.timelineDot,
                    trip.status === 'DELIVERED' ? styles.dotDone : styles.dotPending,
                  ]}
                >
                  {trip.status === 'DELIVERED' ? (
                    <IconCheck color="#FFFFFF" size={9} strokeWidth={3} />
                  ) : (
                    <View style={styles.pendingInnerDot} />
                  )}
                </View>
              </View>
              <View style={styles.timelineTextCol}>
                <View style={styles.timelineTitleRow}>
                  <Text
                    style={
                      trip.status === 'DELIVERED'
                        ? styles.timelineStepLabelActive
                        : styles.timelineStepLabel
                    }
                  >
                    Giao hàng
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.timelineAddressText}>
                  {trip.destination}
                </Text>
              </View>
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
            {driverPlate ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Biển số xe</Text>
                <Text style={styles.detailValue}>{driverPlate}</Text>
              </View>
            ) : null}
            {driverType ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Loại xe</Text>
                <Text style={styles.detailValue}>
                  {driverType}
                  {driverCapacity ? ` (${driverCapacity})` : ''}
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
                style={({ pressed }) => [styles.vietQrBtn, pressed && styles.actionBtnPressed]}
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
                <Text style={styles.invoiceSubTitle}>Tuân thủ Nghị định 123 &amp; Thông tư 78</Text>
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
              pressed && styles.pressedScale,
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
                  pressed && styles.pressedScale,
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

        {/* Delivery Completion Rating Card */}
        {trip.status === 'DELIVERED' ? (
          <>
            <View style={styles.divider} />
            <View style={styles.deliveryReviewCard}>
              <View style={styles.deliveryReviewHeader}>
                <Text style={styles.deliveryReviewTitle}>Chuyến đi đã hoàn tất</Text>
                <Text style={styles.deliveryReviewSubtext}>
                  Vui lòng dành ít phút để đánh giá chất lượng phục vụ của bác tài.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Đánh giá chuyến đi"
                accessibilityRole="button"
                onPress={() => {
                  haptic.medium();
                  onReviewTrip?.();
                }}
                style={({ pressed }) => [
                  styles.reviewCtaBtn,
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <IconStar color={leopardPalette.accentYellow} filled size={18} />
                <Text style={styles.reviewCtaLabel}>Đánh giá chuyến đi</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
});

// ── Memoized Bottom Sheet (Strictly Isolated from Socket GPS Jitter) ──

type TrackingBottomSheetProps = Readonly<{
  driver: DriverInfo;
  trip: TripBookingDetails;
  snapPoint: SnapPoint;
  onToggleSnap: () => void;
  onCall: () => void;
  onChat: () => void;
  onShowVietQR?: () => void;
  onViewDeliveryProof?: () => void;
  onViewInvoice?: () => void;
  onReviewTrip?: () => void;
  maskedPhone: string;
  formattedRating: string | null;
  progressPct: number;
}>;

const TrackingBottomSheet = React.memo(function TrackingBottomSheet({
  driver,
  formattedRating,
  maskedPhone,
  onCall,
  onChat,
  onReviewTrip,
  onShowVietQR,
  onToggleSnap,
  onViewDeliveryProof,
  onViewInvoice,
  progressPct,
  snapPoint,
  trip,
}: TrackingBottomSheetProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -25) {
            // Dragged up
            onToggleSnap();
          } else if (gestureState.dy > 25) {
            // Dragged down
            onToggleSnap();
          } else {
            // Tap handle
            onToggleSnap();
          }
        },
      }),
    [onToggleSnap],
  );

  const isExpanded = snapPoint !== 'MINI';

  return (
    <View
      style={[
        styles.bottomSheet,
        snapPoint === 'MINI' && styles.bottomSheetMini,
        snapPoint === 'HALF' && styles.bottomSheetHalf,
        snapPoint === 'FULL' && styles.bottomSheetFull,
      ]}
    >
      {/* Drag handle */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <Pressable
          accessibilityLabel={snapPoint === 'FULL' ? 'Thu gọn' : 'Mở rộng'}
          accessibilityRole="button"
          hitSlop={12}
          onPress={onToggleSnap}
          style={styles.handleWrap}
        >
          <View style={styles.dragHandle} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* VIP Driver Card with quick actions */}
        <VipDriverCard
          driver={driver}
          formattedRating={formattedRating}
          isExpanded={isExpanded}
          maskedPhone={maskedPhone}
          onCall={onCall}
          onChat={onChat}
          onToggleDetails={onToggleSnap}
        />

        {/* Cargo & Booking Details Card */}
        <CargoBookingCard
          driverCapacity={driver.vehicleCapacity}
          driverPlate={driver.vehiclePlate}
          driverType={driver.vehicleType}
          onReviewTrip={onReviewTrip}
          onShowVietQR={onShowVietQR}
          onViewDeliveryProof={onViewDeliveryProof}
          onViewInvoice={onViewInvoice}
          progressPct={progressPct}
          trip={trip}
        />
      </ScrollView>
    </View>
  );
});

// ── Main Screen Component ───────────────────────────────────────────

export function RealtimeTrackingScreen({
  driver,
  isSimulatedData,
  onBack,
  onCallDriver,
  onChatDriver,
  onReviewTrip,
  onShowVietQR,
  onViewDeliveryProof,
  onViewInvoice,
  trip,
  truckLocation,
}: RealtimeTrackingScreenProps) {
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('MINI');
  const [internalQrModalVisible, setInternalQrModalVisible] = useState(false);

  const isSimulated = Boolean(
    isSimulatedData ||
    trip.isSimulated ||
    trip.isDemo ||
    trip.bookingCode?.toUpperCase().includes('DEMO'),
  );

  const progressPct = useMemo(() => {
    if (!trip.distanceTotalKm || trip.distanceTotalKm <= 0) return 0;
    const traveled = trip.distanceTotalKm - trip.distanceRemainingKm;
    return Math.max(0, Math.min(100, (traveled / trip.distanceTotalKm) * 100));
  }, [trip.distanceTotalKm, trip.distanceRemainingKm]);

  const rawPhone = driver.phone || '0901234567';
  const maskedPhone = useMemo(() => {
    return rawPhone.length >= 7
      ? `${rawPhone.slice(0, 4)} *** ${rawPhone.slice(-3)}`
      : rawPhone;
  }, [rawPhone]);

  const formattedRating = useMemo(() => {
    if (typeof driver.rating !== 'number') return null;
    return Number.isInteger(driver.rating * 10)
      ? driver.rating.toFixed(1)
      : driver.rating.toFixed(2);
  }, [driver.rating]);

  const handleCall = useCallback(() => {
    haptic.medium();
    if (onCallDriver) {
      onCallDriver();
      return;
    }
    void Linking.openURL(`tel:${rawPhone}`).catch(() => {
      Alert.alert('Gọi tài xế', `Số điện thoại tài xế: ${maskedPhone}`);
    });
  }, [onCallDriver, rawPhone, maskedPhone]);

  const handleChat = useCallback(() => {
    haptic.medium();
    if (onChatDriver) {
      onChatDriver();
      return;
    }
    Alert.alert('Nhắn tin', `Nhắn tin trao đổi với tài xế ${driver.name}`);
  }, [onChatDriver, driver.name]);

  const handleOpenVietQR = useCallback(() => {
    haptic.medium();
    if (onShowVietQR) {
      onShowVietQR();
    } else {
      setInternalQrModalVisible(true);
    }
  }, [onShowVietQR]);

  const handleCloseQrModal = useCallback(() => {
    haptic.light();
    setInternalQrModalVisible(false);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    setInternalQrModalVisible(false);
    Alert.alert('Thanh toán thành công', 'Hệ thống đã tự động gạch nợ thành công qua payOS.');
  }, []);

  const toggleSnap = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    haptic.selection();
    setSnapPoint((prev) => {
      if (prev === 'MINI') return 'HALF';
      if (prev === 'HALF') return 'FULL';
      return 'MINI';
    });
  }, []);

  const handleLocate = useCallback(() => {
    haptic.light();
  }, []);

  const handleSos = useCallback(() => {
    haptic.medium();
    Alert.alert(
      'Hỗ trợ khẩn cấp 24/7',
      'Bạn có muốn kết nối ngay với Tổng đài Điều phối cứu hộ khẩn cấp LEOPARD 1900 6868?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gọi ngay',
          style: 'destructive',
          onPress: () => {
            void Linking.openURL('tel:19006868');
          },
        },
      ],
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* ── LAYER 0: Full-Bleed Map (Optimized for real-time socket tracking) ── */}
      <TrackingMapLayer
        destination={trip.destination}
        destinationCoords={trip.destinationCoords}
        distanceRemainingKm={trip.distanceRemainingKm}
        distanceTotalKm={trip.distanceTotalKm}
        origin={trip.origin}
        originCoords={trip.originCoords}
        routeCoords={trip.routeCoords}
        snapPoint={snapPoint}
        status={trip.status}
        stops={trip.stops}
        truckEtaLabel={trip.etaLabel}
        truckEtaMinutes={trip.etaMinutes}
        truckLocation={truckLocation}
      />

      {/* ── LAYER 1: Floating Header & Dynamic Island Status Bar (Apple HIG) ── */}
      <TrackingTopBar
        distanceRemainingKm={trip.distanceRemainingKm}
        etaLabel={trip.etaLabel}
        isSimulated={isSimulated}
        onBack={onBack}
        status={trip.status}
      />

      {/* ── LAYER 2: Floating Action Controls (Apple Maps Glass Controls) ── */}
      <FloatingActionControls
        onLocate={handleLocate}
        onSos={handleSos}
        snapPoint={snapPoint}
      />

      {/* ── LAYER 3: Interactive Map-First Bottom Sheet (Mini/Half/Full) ── */}
      <TrackingBottomSheet
        driver={driver}
        formattedRating={formattedRating}
        maskedPhone={maskedPhone}
        onCall={handleCall}
        onChat={handleChat}
        onReviewTrip={onReviewTrip}
        onShowVietQR={handleOpenVietQR}
        onToggleSnap={toggleSnap}
        onViewDeliveryProof={onViewDeliveryProof}
        onViewInvoice={onViewInvoice}
        progressPct={progressPct}
        snapPoint={snapPoint}
        trip={trip}
      />

      {/* Dynamic VietQR Payment Modal */}
      <VietQRPaymentModal
        amount={parseInt(trip.priceVnd.replace(/[^0-9]/g, ''), 10) || 850000}
        amountLabel={trip.priceVnd}
        onClose={handleCloseQrModal}
        onPaymentSuccess={handlePaymentSuccess}
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
    gap: spacing.xs,
  },
  mapTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: radius.pill,
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
  controlBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  statusTagOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
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
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: spacing.xxs,
  },
  statusTextOverlay: {
    ...typeScale.caption1,
    fontWeight: '600',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.danger.text,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
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
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: pastelTheme.yellowCard.bg,
    borderColor: pastelTheme.yellowCard.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  demoBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: pastelTheme.yellowCard.text,
    letterSpacing: 0.4,
  },

  // Floating Status Bar (Strict "ETA dự kiến", Tabular Nums)
  fixedStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    gap: spacing.xs,
  },
  fixedStatusIconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.cardSm,
    backgroundColor: colors.info.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedStatusText: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },

  // ── LAYER 2: Floating Action Controls (Apple Maps Style) ──
  floatingControlsStack: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 30,
    gap: spacing.xs,
    alignItems: 'center',
  },
  floatingControlBtn: {
    width: 46,
    height: 46,
    minWidth: 46,
    minHeight: 46,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  sosBtn: {
    backgroundColor: colors.danger.text,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sosBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.caption1,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locateBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(11, 30, 66, 0.12)',
  },
  floatingBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },

  // ── LAYER 3: VIP Driver Card ──────────────────────
  vipDriverCardOuter: {
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: customerPalette.surfaceWhite,
    padding: spacing.sm,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  vipDriverCardInner: {
    borderRadius: radius.card,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  driverAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
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
    width: spacing.md,
    height: spacing.md,
    borderRadius: spacing.xs,
    backgroundColor: colors.success.text,
    borderWidth: 1.5,
    borderColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTextCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  driverName: {
    color: customerPalette.textSlateDark,
    ...typeScale.callout,
    fontWeight: '600',
  },
  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  plateBadgeMini: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: leopardPalette.inputBorder,
    borderWidth: 1,
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  plateTextMini: {
    color: customerPalette.textSlateDark,
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: pastelTheme.yellowCard.bg,
    borderColor: pastelTheme.yellowCard.border,
    borderWidth: 1,
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  ratingText: {
    color: customerPalette.textSlateDark,
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tripsText: {
    color: customerPalette.textMutedSlate,
    ...typeScale.caption2,
  },
  driverPhoneMasked: {
    color: customerPalette.textMutedSlate,
    ...typeScale.caption2,
    fontVariant: ['tabular-nums'],
  },
  driverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    height: 42,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  callBtn: {
    backgroundColor: customerPalette.primary,
  },
  callBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  chatBtn: {
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: leopardPalette.inputBorder,
  },
  chatBtnText: {
    color: customerPalette.primary,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  detailsBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  detailsBtnText: {
    color: customerPalette.primary,
    ...typeScale.footnote,
    fontWeight: '700',
  },

  // ── LAYER 4: Cargo & Booking Card ─────────────────
  cargoCardOuter: {
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: customerPalette.surfaceWhite,
    padding: spacing.sm,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cargoCardInner: {
    borderRadius: radius.card,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    color: customerPalette.textSlateDark,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  progressSection: {
    gap: spacing.xs,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaHeaderBadge: {
    backgroundColor: colors.info.background,
    borderColor: leopardPalette.inputBorder,
    borderWidth: 1,
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  etaBadgeText: {
    color: customerPalette.primary,
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    marginVertical: spacing.xxs,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral.surfaceMuted,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: leopardPalette.accentYellow,
    borderRadius: 3,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStatCol: {
    gap: 1,
  },
  statAlignEnd: {
    alignItems: 'flex-end',
  },
  progressStatSub: {
    ...typeScale.caption2,
    color: customerPalette.textMutedSlate,
  },
  progressLabelLeft: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
  },
  progressLabelRight: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: leopardPalette.accentYellow,
    fontVariant: ['tabular-nums'],
  },

  // 3-Step Timeline Box
  timelineBox: {
    marginTop: spacing.xs,
    gap: spacing.hairline,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timelineItemLast: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotDone: {
    backgroundColor: colors.success.text,
  },
  dotActive: {
    backgroundColor: customerPalette.primary,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dotPending: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderWidth: 1.5,
    borderColor: leopardPalette.inputBorder,
  },
  pendingInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: customerPalette.textSubtle,
  },
  timelineHairline: {
    width: 2,
    flex: 1,
    minHeight: 22,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  timelineTextCol: {
    flex: 1,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timelineStepLabel: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  timelineStepLabelActive: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: customerPalette.primary,
  },
  timelineSubBadge: {
    ...typeScale.caption2,
    color: colors.success.text,
    fontWeight: '600',
  },
  timelineSubBadgeActive: {
    ...typeScale.caption2,
    color: leopardPalette.accentYellow,
    fontWeight: '700',
  },
  timelineAddressText: {
    ...typeScale.caption1,
    color: customerPalette.textMutedSlate,
  },

  divider: {
    height: 1,
    backgroundColor: customerPalette.cardBorder,
  },

  // Booking details
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
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardSm,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: 2,
  },
  detailLabel: {
    ...typeScale.caption2,
    color: customerPalette.textMutedSlate,
  },
  detailValue: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardSm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    marginTop: spacing.xxs,
  },
  pricingCol: {
    gap: 2,
  },
  pricingLabel: {
    ...typeScale.caption2,
    color: customerPalette.textMutedSlate,
  },
  pricingValue: {
    ...typeScale.headline,
    fontWeight: '800',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  vietQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.success.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    shadowColor: colors.success.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  vietQrBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.subheadline,
    fontWeight: '700',
  },

  // Invoice Section
  invoiceSection: {
    gap: spacing.xs,
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  invoiceSubTitle: {
    ...typeScale.caption2,
    color: customerPalette.textMutedSlate,
  },
  vatRatePill: {
    backgroundColor: pastelTheme.yellowCard.bg,
    borderColor: pastelTheme.yellowCard.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  vatRatePillText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  invoiceDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardSm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  invoiceDownloadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  invoicePdfIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.cardSm,
    backgroundColor: colors.danger.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicePdfIconText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.caption2,
    fontWeight: '700',
  },
  invoiceDownloadTextWrap: {
    gap: spacing.hairline,
  },
  invoiceDownloadLabel: {
    color: customerPalette.primary,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  invoiceDownloadSubLabel: {
    color: customerPalette.textSubtle,
    ...typeScale.caption2,
  },

  // Delivery Proof Section
  proofSection: {
    gap: spacing.xs,
  },
  proofThumbnailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: leopardPalette.ecoGreenBg,
    borderColor: leopardPalette.ecoGreenBorder,
    borderWidth: 1,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    minHeight: control.stickyPrimaryMinimumHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  proofThumbnail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  proofIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.cardSm,
    backgroundColor: colors.success.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofTextWrap: {
    gap: spacing.hairline,
  },
  proofLabel: {
    color: colors.success.text,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  proofSubLabel: {
    color: colors.brand.green,
    ...typeScale.caption2,
  },
  proofVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  proofVerifiedText: {
    color: colors.success.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },

  // Delivery Completion Rating Card
  deliveryReviewCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.md,
    gap: spacing.sm,
  },
  deliveryReviewHeader: {
    gap: spacing.xxs,
  },
  deliveryReviewTitle: {
    ...typeScale.headline,
    color: customerPalette.textSlateDark,
    fontWeight: '700',
  },
  deliveryReviewSubtext: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
  },
  reviewCtaBtn: {
    height: 52,
    backgroundColor: customerPalette.primary,
    borderRadius: 14,
    ...iosContinuousCurve,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reviewCtaLabel: {
    color: '#FFFFFF',
    ...typeScale.subheadline,
    fontWeight: '600',
  },

  // ── LAYER 5: Interactive Bottom Sheet (Apple Maps Sheet) ──
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.98)',
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    zIndex: 40,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomSheetMini: {
    maxHeight: '26%',
    minHeight: 180,
  },
  bottomSheetHalf: {
    maxHeight: '58%',
    minHeight: 380,
  },
  bottomSheetFull: {
    maxHeight: '92%',
    minHeight: '88%',
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  handleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
    width: '100%',
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: spacing.hairline,
    backgroundColor: leopardPalette.inputBorder,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },

  // Utilities
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressedScale: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
