import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DriverModalSurface } from '../../navigation/DriverModalSurface';

import {
  Badge,
  Box,
  Card,
  HStack,
  IconClock,
  IconClose,
  IconLocationPin,
  IconOrders,
  IconRoute,
  IconSpeedTruck,
  LeopardMapView,
  SlideToAction,
  VStack,
  colors,
  driverHapticMatrix,
  haptic,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export function formatPublicArea(address?: string | null): string {
  if (!address || !address.trim()) {
    return 'Khu vực chưa xác định';
  }
  const clean = address.trim();
  if (clean.toLowerCase().startsWith('khu vực')) {
    return clean;
  }
  const districtMatch = clean.match(
    /(?:Quận|Huyện|Thị xã|Q\.)\s*[^,]+/i,
  );
  if (districtMatch) {
    return `Khu vực ${districtMatch[0].trim()}`;
  }
  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `Khu vực ${parts.slice(-2).join(', ')}`;
  }
  return `Khu vực ${clean}`;
}

function formatVnd(amount: number): string {
  const integerPart = Math.round(amount).toString();
  const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted} ₫`;
}

export type IncomingDispatchOffer = Readonly<{
  orderId?: string;
  id?: any;
  pickupAddress: string;
  dropoffAddress: string;
  earningsAmount?: number;
  distanceKm?: number;
  pickupDistanceKm?: number;
  expiresAtEpochMs?: number;
  cargoName?: string;
  cargoWeightKg?: number;
  cargoDimensions?: string;
  loadingFee?: number;
  loadingDescription?: string;
  cargoPhotoUrl?: string;
  specialNotes?: string;

  // Legacy fields for backward compatibility
  reference?: string;
  pickupDistanceLabel?: string;
  pickupArea?: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffArea?: string;
  dropoffCoords?: { lat: number; lng: number };
  tripDistanceLabel?: string;
  etaLabel?: string;
  priceLabel?: string;
  vehicleLabel?: string;
  cargoSummary?: string;
  notes?: string;
  timeoutSeconds?: number;
}>;

export type IncomingDispatchModalProps = Readonly<{
  offer: IncomingDispatchOffer | null;
  visible: boolean;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
  isAccepting?: boolean;
  countdownSeconds?: number;
  queuedOfferCount?: number;
}>;

/* ──────────────────────────────────────────────────────────────────────────
 * Memoized sub-components to prevent re-rendering entire modal tree every 1s
 * ────────────────────────────────────────────────────────────────────────── */

type HeroMapSectionProps = {
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  pickupDistText: string;
};

const HeroMapSection = memo(function HeroMapSection({
  dropoffAddress,
  dropoffCoords,
  pickupAddress,
  pickupCoords,
  pickupDistText,
}: HeroMapSectionProps) {
  return (
    <View style={styles.modalMapCanvas} testID="dispatch-modal-map">
      <LeopardMapView
        destination={{ label: dropoffAddress, coords: dropoffCoords }}
        height="100%"
        mode="route"
        origin={{ label: pickupAddress, coords: pickupCoords }}
      />
      {pickupDistText ? (
        <View style={styles.mapFloatingDistancePill}>
          <IconLocationPin color={leopardPalette.primary} size={12} />
          <Text style={styles.mapFloatingDistanceText}>
            Điểm đón · {pickupDistText}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

type FareCardSectionProps = {
  fareAmount: string;
  isUrgent: boolean;
};

const FareCardSection = memo(function FareCardSection({
  fareAmount,
  isUrgent,
}: FareCardSectionProps) {
  return (
    <View style={[styles.fareCard, isUrgent ? styles.fareCardUrgent : null]}>
      <View style={styles.fareHeaderRow}>
        <Text style={styles.fareCaption}>Cước thực nhận dự kiến</Text>
        <View style={styles.fareNetPill}>
          <Text style={styles.fareNetPillText}>Thu nhập ròng</Text>
        </View>
      </View>
      <Text style={[styles.fareAmount, isUrgent ? styles.fareAmountUrgent : null]}>{fareAmount}</Text>
      <Text style={styles.fareSub}>Thực nhận sau chiết khấu</Text>
    </View>
  );
});

type RouteSpineSectionProps = {
  pickupDisplay: string;
  dropoffDisplay: string;
  pickupBadgeText: string;
  tripDistText: string;
  etaLabel?: string;
};

const RouteSpineSection = memo(function RouteSpineSection({
  dropoffDisplay,
  etaLabel,
  pickupBadgeText,
  pickupDisplay,
  tripDistText,
}: RouteSpineSectionProps) {
  return (
    <View style={styles.routeCard}>
      <View style={styles.routeSpineColumn}>
        <View style={styles.spineOriginCircle}>
          <Text style={styles.spinePointTextA}>A</Text>
        </View>
        <View style={styles.spineTrackDotted} />
        <View style={styles.spineDestSquare}>
          <Text style={styles.spinePointTextB}>B</Text>
        </View>
      </View>

      <View style={styles.routeAddressesColumn}>
        <View style={styles.addressBlock}>
          <View style={styles.addressTitleRow}>
            <Text style={styles.addressTypeLabel}>Điểm lấy hàng</Text>
            {pickupBadgeText ? (
              <View style={styles.pickupDistBadge}>
                <IconLocationPin color={leopardPalette.primary} size={11} />
                <Text style={styles.pickupDistText}>{pickupBadgeText}</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={2} style={styles.addressNameText}>
            {pickupDisplay}
          </Text>
        </View>

        {tripDistText ? (
          <View style={styles.transitMetaRow}>
            <IconRoute color="#64748B" size={13} />
            <Text style={styles.transitMetaText}>
              {etaLabel
                ? `Lộ trình ${tripDistText} · Khoảng ${etaLabel}`
                : `Lộ trình ${tripDistText}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.addressBlock}>
          <Text style={styles.addressTypeLabelDropoff}>Điểm giao hàng</Text>
          <Text numberOfLines={2} style={styles.addressNameText}>
            {dropoffDisplay}
          </Text>
        </View>
      </View>
    </View>
  );
});

type CargoBentoSectionProps = {
  cargoName: string;
  vehicleLabel?: string;
  cargoWeightKg?: number;
  cargoDimensions?: string;
  loadingBadgeLabel: string | null;
  cargoPhotoUrl?: string;
  specialNotes?: string;
  onOpenPhotoPreview: () => void;
};

const CargoBentoSection = memo(function CargoBentoSection({
  cargoDimensions,
  cargoName,
  cargoPhotoUrl,
  cargoWeightKg,
  loadingBadgeLabel,
  onOpenPhotoPreview,
  specialNotes,
  vehicleLabel,
}: CargoBentoSectionProps) {
  return (
    <View style={styles.cargoCard} testID="cargo-bento-card">
      <View style={styles.cargoHeaderRow}>
        <View style={styles.cargoTitleRow}>
          <IconOrders color={leopardPalette.primary} size={15} />
          <Text style={styles.cargoHeaderTitle}>Thông tin hàng hóa</Text>
        </View>
        {vehicleLabel ? (
          <View style={styles.specChip} testID="dispatch-vehicle-spec-chip">
            <IconSpeedTruck color={leopardPalette.primary} size={13} />
            <Text style={styles.specChipText}>{vehicleLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cargoBodyRow}>
        <View style={styles.cargoInfoColumn}>
          <Text numberOfLines={2} style={styles.cargoNameText}>
            {cargoName}
          </Text>

          {(cargoWeightKg !== undefined || cargoDimensions) ? (
            <View style={styles.cargoSpecsRow}>
              {cargoWeightKg !== undefined ? (
                <View style={styles.cargoSpecPill}>
                  <Text style={styles.cargoSpecValue}>{cargoWeightKg} kg</Text>
                </View>
              ) : null}
              {cargoDimensions ? (
                <View style={styles.cargoSpecPill}>
                  <Text style={styles.cargoSpecValue}>{cargoDimensions}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {loadingBadgeLabel ? (
            <View style={styles.loadingFeeBadge}>
              <Text style={styles.loadingFeeBadgeText}>{loadingBadgeLabel}</Text>
            </View>
          ) : null}
        </View>

        {cargoPhotoUrl ? (
          <Pressable
            accessibilityHint="Chạm để phóng to xem chi tiết hàng hóa"
            accessibilityLabel="Xem ảnh hàng hóa"
            accessibilityRole="button"
            onPress={onOpenPhotoPreview}
            style={styles.cargoThumbnailWrapper}
            testID="cargo-photo-thumbnail"
          >
            <Image
              accessibilityLabel="Ảnh hàng hóa"
              source={{ uri: cargoPhotoUrl }}
              style={styles.cargoThumbnailImage}
            />
          </Pressable>
        ) : null}
      </View>

      {specialNotes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>{specialNotes}</Text>
        </View>
      ) : null}
    </View>
  );
});

type ActionControlsSectionProps = {
  targetOrderId: string;
  isAccepting: boolean;
  onAccept: (orderId: string) => void;
  onDecline: (orderId: string) => void;
};

const ActionControlsSection = memo(function ActionControlsSection({
  isAccepting,
  onAccept,
  onDecline,
  targetOrderId,
}: ActionControlsSectionProps) {
  const handleDecline = () => {
    try {
      haptic.light();
    } catch {
      // safe fallback
    }
    onDecline(targetOrderId);
  };

  return (
    <View style={styles.actionsContainer}>
      <SlideToAction
        key={targetOrderId}
        resetKey={targetOrderId}
        colorVariant="brand"
        disabled={isAccepting}
        label="Vuốt để nhận cuốc"
        onActionComplete={() => onAccept(targetOrderId)}
        testID="dispatch-slide-action"
      />
      <Pressable
        accessibilityHint="Bỏ qua đơn hàng này"
        accessibilityLabel="Bỏ qua"
        accessibilityRole="button"
        disabled={isAccepting}
        hitSlop={spacing.xs}
        onPress={handleDecline}
        style={({ pressed }) => [
          styles.declineButton,
          pressed && !isAccepting ? styles.declineButtonPressed : null,
          isAccepting ? styles.declineButtonDisabled : null,
        ]}
      >
        <Text style={styles.declineButtonText}>Bỏ qua</Text>
      </Pressable>
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────────────────
 * Main IncomingDispatchModal Component
 * ────────────────────────────────────────────────────────────────────────── */

export function IncomingDispatchModal({
  countdownSeconds,
  isAccepting = false,
  offer,
  onAccept,
  onDecline,
  queuedOfferCount,
  visible,
}: IncomingDispatchModalProps) {
  const targetOrderId = offer?.orderId ?? offer?.id ?? '';

  const calculateSecondsLeft = useCallback((targetOffer: IncomingDispatchOffer | null) => {
    if (countdownSeconds !== undefined) return countdownSeconds;
    if (!targetOffer) return 0;
    if (targetOffer.expiresAtEpochMs) {
      return Math.max(0, Math.ceil((targetOffer.expiresAtEpochMs - Date.now()) / 1000));
    }
    return targetOffer.timeoutSeconds ?? 15;
  }, [countdownSeconds]);

  const [secondsLeft, setSecondsLeft] = useState(() => calculateSecondsLeft(offer));
  const [totalDuration, setTotalDuration] = useState(() => calculateSecondsLeft(offer));
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  // UI-thread pulse animation for radar
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible || !offer) return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => {
      pulseLoop.stop();
      pulseAnim.setValue(1);
    };
  }, [visible, offer, pulseAnim]);

  // Keep decline handler fresh without re-triggering timer effect
  const onDeclineRef = useRef(onDecline);
  onDeclineRef.current = onDecline;

  // Lifecycle timer: countdown with clean unmount and accepting-pause guard
  useEffect(() => {
    if (!visible || !offer || isAccepting) return;

    const initial = calculateSecondsLeft(offer);
    setSecondsLeft(initial);
    setTotalDuration(Math.max(1, initial));

    if (initial <= 0) {
      onDeclineRef.current(targetOrderId);
      return;
    }

    const expiryEpochMs = offer.expiresAtEpochMs ?? (Date.now() + initial * 1000);

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiryEpochMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 5 && remaining > 0) {
        try {
          driverHapticMatrix.countdownCritical();
        } catch {
          // ignore
        }
      }
      if (remaining <= 0) {
        clearInterval(timer);
        onDeclineRef.current(targetOrderId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    visible,
    offer?.orderId,
    offer?.id,
    offer?.expiresAtEpochMs,
    offer?.timeoutSeconds,
    targetOrderId,
    calculateSecondsLeft,
    isAccepting,
  ]);

  const handleOpenPhotoPreview = useCallback(() => {
    setPhotoPreviewOpen(true);
  }, []);

  if (!visible || !offer) return null;

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / Math.max(1, totalDuration)) * 100));
  const isUrgent = secondsLeft <= 5;
  const isWarning = secondsLeft <= 10 && !isUrgent;

  const pickupDisplay = offer.pickupArea || formatPublicArea(offer.pickupAddress);
  const dropoffDisplay = offer.dropoffArea || formatPublicArea(offer.dropoffAddress);

  const fareAmount =
    offer.earningsAmount !== undefined
      ? formatVnd(offer.earningsAmount)
      : offer.priceLabel ?? '0 ₫';

  const pickupDistText = offer.pickupDistanceLabel
    ? offer.pickupDistanceLabel
    : offer.pickupDistanceKm !== undefined
      ? `${offer.pickupDistanceKm} km`
      : '';

  const pickupBadgeText = pickupDistText
    ? (pickupDistText.startsWith('Cách bạn') ? pickupDistText : `Cách bạn ${pickupDistText}`)
    : '';

  const tripDistText = offer.tripDistanceLabel
    ? offer.tripDistanceLabel
    : offer.distanceKm !== undefined
      ? `${offer.distanceKm} km`
      : '';

  const cargoName = offer.cargoName || offer.cargoSummary || 'Hàng hóa tiêu chuẩn';
  const specialNotes = offer.specialNotes || offer.notes;

  const hasLoadingFee = Boolean(offer.loadingFee && offer.loadingFee > 0);
  const formattedLoadingFee = hasLoadingFee && offer.loadingFee
    ? formatVnd(offer.loadingFee).replace(/\s*₫/, '₫')
    : '';
  const loadingBadgeLabel = hasLoadingFee
    ? offer.loadingDescription
      ? `${offer.loadingDescription} (+${formattedLoadingFee})`
      : `Bốc xếp (+${formattedLoadingFee})`
    : null;

  return (
    <DriverModalSurface
      animationType="slide"
      hardwareAccelerated
      onRequestClose={() => onDecline(targetOrderId)}
      statusBarTranslucent
      testID="incoming-dispatch-modal"
      transparent
      visible={visible}
    >
      <View style={styles.scrimOverlay}>
        {queuedOfferCount && queuedOfferCount > 0 ? (
          <View style={styles.queueToast} testID="queue-toast">
            <Text style={styles.queueToastText}>
              🔔 CÓ {queuedOfferCount} ĐƠN KHÁC ĐANG CHỜ TRONG HÀNG
            </Text>
            <Text style={styles.queueToastSubtext}>
              (Sẽ tự động hiện sau khi kết thúc)
            </Text>
          </View>
        ) : null}
        <View style={styles.sheetContainer}>
          {/* Apple Modal Sheet Grabber Handle */}
          <View style={styles.sheetGrabber} />

          {/* 1. Header Bar with Animated Radar Pulse, Title, Countdown, and Decline ("Từ chối") Button */}
          <View style={styles.modalHeader}>
            <View style={styles.radarPulseContainer}>
              <Animated.View
                style={[
                  styles.radarPulseOuter,
                  isUrgent ? styles.radarPulseOuterUrgent : null,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={[styles.radarPulseCore, isUrgent ? styles.radarPulseCoreUrgent : null]} />
              </Animated.View>
              <Text style={[styles.modalBadgeText, isUrgent ? styles.modalBadgeTextUrgent : null]}>
                Đơn mới trong khu vực
              </Text>
            </View>

            <View style={styles.modalHeaderRight}>
              <View
                style={[
                  styles.timerBadge,
                  isUrgent ? styles.timerBadgeUrgent : isWarning ? styles.timerBadgeWarning : null,
                ]}
              >
                <IconClock
                  color={isUrgent ? colors.danger.text : isWarning ? leopardPalette.accentYellowDark : leopardPalette.primary}
                  size={14}
                />
                <Text
                  style={[
                    styles.timerText,
                    isUrgent ? styles.timerUrgent : isWarning ? styles.timerWarning : null,
                  ]}
                >
                  {secondsLeft}s
                </Text>
              </View>
              <Pressable
                accessibilityHint="Từ chối đơn hàng này"
                accessibilityLabel="Từ chối"
                accessibilityRole="button"
                hitSlop={spacing.xs}
                onPress={() => onDecline(targetOrderId)}
                style={[styles.modalCloseBtn, styles.srOnly]}
                testID="dispatch-modal-decline-top"
              >
                <IconClose color={colors.neutral.subtleText} size={16} />
              </Pressable>
            </View>
          </View>

          {/* 2. Countdown Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent}%` },
                isUrgent
                  ? styles.progressBarUrgent
                  : isWarning
                    ? styles.progressBarWarning
                    : styles.progressBarNormal,
              ]}
              testID="countdown-progress-bar"
            />
          </View>

          {/* Scrollable Center Content */}
          <ScrollView
            contentContainerStyle={styles.centerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 3. Hero Mini Route Map (Memoized) */}
            <HeroMapSection
              dropoffAddress={offer.dropoffAddress}
              dropoffCoords={offer.dropoffCoords}
              pickupAddress={offer.pickupAddress}
              pickupCoords={offer.pickupCoords}
              pickupDistText={pickupDistText}
            />

            {/* 4. Fare Card - Double-Bezel (Memoized) */}
            <FareCardSection
              fareAmount={fareAmount}
              isUrgent={isUrgent}
            />

            {/* 5. Route Spine: Pickup -> Dropoff Double-Bezel (Memoized) */}
            <RouteSpineSection
              dropoffDisplay={dropoffDisplay}
              etaLabel={offer.etaLabel}
              pickupBadgeText={pickupBadgeText}
              pickupDisplay={pickupDisplay}
              tripDistText={tripDistText}
            />

            {/* 6. Cargo Bento Card (Memoized) */}
            <CargoBentoSection
              cargoDimensions={offer.cargoDimensions}
              cargoName={cargoName}
              cargoPhotoUrl={offer.cargoPhotoUrl}
              cargoWeightKg={offer.cargoWeightKg}
              loadingBadgeLabel={loadingBadgeLabel}
              onOpenPhotoPreview={handleOpenPhotoPreview}
              specialNotes={specialNotes}
              vehicleLabel={offer.vehicleLabel}
            />
          </ScrollView>

          {/* 7. Action Controls: SlideToAction + Decline Button (Memoized) */}
          <ActionControlsSection
            isAccepting={isAccepting}
            onAccept={onAccept}
            onDecline={onDecline}
            targetOrderId={targetOrderId}
          />
        </View>
      </View>

      {/* Cargo Photo Preview Modal */}
      {offer.cargoPhotoUrl ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setPhotoPreviewOpen(false)}
          statusBarTranslucent
          testID="cargo-photo-preview-modal"
          transparent
          visible={photoPreviewOpen}
        >
          <View style={styles.previewBackdrop}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Ảnh hàng hóa</Text>
              <Pressable
                accessibilityLabel="Đóng xem ảnh"
                accessibilityRole="button"
                hitSlop={spacing.sm}
                onPress={() => setPhotoPreviewOpen(false)}
                style={styles.previewCloseBtn}
                testID="cargo-photo-preview-close"
              >
                <IconClose color={colors.neutral.surface} size={18} />
              </Pressable>
            </View>
            <View style={styles.previewImageContainer}>
              <Image
                accessibilityLabel="Ảnh chi tiết hàng hóa"
                resizeMode="contain"
                source={{ uri: offer.cargoPhotoUrl }}
                style={styles.previewImage}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </DriverModalSurface>
  );
}

// ponytail: Static styles adhere to Apple HIG 4pt spacing scale, radius tokens, and typeScale ramps.
const styles = StyleSheet.create({
  scrimOverlay: {
    backgroundColor: 'rgba(11, 37, 69, 0.45)', // Apple dimming scrim
    flex: 1,
    justifyContent: 'flex-end', // bottom-up sheet presentation
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 0,
    flex: 1,
    height: '100%',
    width: '100%',
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    justifyContent: 'space-between',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetGrabber: {
    width: 38,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  centerScrollContent: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
    paddingBottom: spacing.sm,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xxs,
  },
  queueToast: {
    position: 'absolute',
    top: spacing.xl,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  queueToastText: {
    color: '#FFFFFF',
    ...typeScale.footnote,
    fontWeight: '700',
  },
  queueToastSubtext: {
    color: '#94A3B8',
    ...typeScale.caption2,
  },
  modalHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  radarPulseContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  radarPulseOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.22)', // Cheetah Golden Amber accent
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radarPulseOuterUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  radarPulseCore: {
    backgroundColor: '#F59E0B', // Amber pulse core
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  radarPulseCoreUrgent: {
    backgroundColor: colors.danger.text,
  },
  modalBadgeText: {
    color: leopardPalette.primary,
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modalBadgeTextUrgent: {
    color: colors.danger.text,
  },
  timerBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4FA',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm - spacing.xxs,
    paddingVertical: spacing.xxs,
  },
  timerBadgeWarning: {
    backgroundColor: leopardPalette.accentYellowBg,
    borderColor: leopardPalette.accentYellowBorder,
  },
  timerBadgeUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  timerText: {
    color: leopardPalette.textSlateDark,
    ...typeScale.subheadline,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  timerWarning: {
    color: leopardPalette.accentYellowDark,
  },
  timerUrgent: {
    color: colors.danger.text,
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    borderRadius: radius.pill,
    height: '100%',
  },
  progressBarNormal: {
    backgroundColor: leopardPalette.primary,
  },
  progressBarWarning: {
    backgroundColor: leopardPalette.accentYellow,
  },
  progressBarUrgent: {
    backgroundColor: colors.danger.text,
  },
  modalMapCanvas: {
    backgroundColor: colors.neutral.text,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    height: 160,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mapFloatingDistancePill: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: spacing.xs,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    flexDirection: 'row',
    gap: spacing.xxs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline + 1,
    position: 'absolute',
    zIndex: 10,
  },
  mapFloatingDistanceText: {
    color: leopardPalette.textSlateDark,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  fareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fareCardUrgent: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF1F2',
  },
  fareHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  fareNetPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  fareNetPillText: {
    color: '#D97706',
    ...typeScale.caption2,
    fontWeight: '700',
  },
  fareCaption: {
    color: '#64748B',
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fareAmount: {
    color: leopardPalette.primary,
    ...typeScale.largeTitle,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xxs,
  },
  fareAmountUrgent: {
    color: colors.danger.text,
  },
  fareSub: {
    color: '#64748B',
    ...typeScale.footnote,
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  routeSpineColumn: {
    alignItems: 'center',
    width: 20,
    paddingTop: 2,
  },
  spineOriginCircle: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: radius.pill,
    height: 18,
    width: 18,
    justifyContent: 'center',
  },
  spinePointTextA: {
    color: '#FFFFFF',
    ...typeScale.caption2,
    fontWeight: '800',
    textAlign: 'center',
  },
  spineTrackDotted: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: spacing.xxs,
    minHeight: 28,
    width: 2,
  },
  spineDestSquare: {
    alignItems: 'center',
    backgroundColor: colors.danger.text,
    borderRadius: 4,
    height: 18,
    width: 18,
    justifyContent: 'center',
  },
  spinePointTextB: {
    color: '#FFFFFF',
    ...typeScale.caption2,
    fontWeight: '800',
    textAlign: 'center',
  },
  routeAddressesColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  addressBlock: {
    gap: 2,
  },
  addressTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  addressTypeLabel: {
    color: '#16A34A',
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  addressTypeLabelDropoff: {
    color: colors.danger.text,
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pickupDistBadge: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  pickupDistText: {
    color: '#1D4ED8',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  addressNameText: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
    lineHeight: 20,
  },
  addressDetailText: {
    color: leopardPalette.textMutedSlate,
    ...typeScale.caption1,
  },
  transitMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
    ...iosContinuousCurve,
  },
  transitMetaText: {
    color: '#64748B',
    ...typeScale.caption1,
    fontWeight: '500',
  },
  cargoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.sm,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cargoHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cargoTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cargoHeaderTitle: {
    color: '#0B2545',
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cargoBodyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cargoInfoColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  cargoNameText: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
    lineHeight: 20,
  },
  cargoSpecsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cargoSpecPill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  cargoSpecValue: {
    color: '#334155',
    ...typeScale.caption1,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  loadingFeeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  loadingFeeBadgeText: {
    color: '#1D4ED8',
    ...typeScale.caption2,
    fontWeight: '700',
  },
  cargoThumbnailWrapper: {
    backgroundColor: '#0F172A',
    borderColor: '#E2E8F0',
    borderRadius: radius.cardSm,
    borderWidth: 1,
    height: 56,
    overflow: 'hidden',
    width: 56,
    ...iosContinuousCurve,
  },
  cargoThumbnailImage: {
    height: '100%',
    width: '100%',
  },
  notesBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.cardSm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...iosContinuousCurve,
  },
  notesText: {
    color: '#B45309',
    ...typeScale.caption1,
  },
  actionsContainer: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
    paddingTop: spacing.xxs,
  },
  declineButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  declineButtonPressed: {
    backgroundColor: '#F1F5F9',
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  declineButtonDisabled: {
    opacity: 0.5,
  },
  declineButtonText: {
    color: '#64748B',
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  previewBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xxxl,
    zIndex: 10,
  },
  previewTitle: {
    color: colors.neutral.surface,
    ...typeScale.callout,
    fontWeight: '600',
  },
  previewCloseBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  previewImageContainer: {
    alignItems: 'center',
    height: '80%',
    justifyContent: 'center',
    width: '100%',
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  specChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  specChipText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  srOnly: {
    height: 1,
    opacity: 0.001,
    position: 'absolute',
    width: 1,
    overflow: 'hidden',
  },
});
