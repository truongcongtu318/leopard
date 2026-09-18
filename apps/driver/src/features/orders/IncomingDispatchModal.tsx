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
    <Card style={[styles.fareBezelOuter, isUrgent ? styles.fareBezelOuterUrgent : null]}>
      <View style={[styles.fareBezelInner, isUrgent ? styles.fareBezelInnerUrgent : null]}>
        <HStack style={styles.fareHeaderRow}>
          <Text style={styles.fareCaption}>Cước thực nhận dự kiến</Text>
          <Badge action="warning" variant="solid" style={styles.fareNetPill}>
            <Badge.Text style={styles.fareNetPillText}>Thu nhập ròng</Badge.Text>
          </Badge>
        </HStack>
        <Text style={styles.fareAmount}>{fareAmount}</Text>
        <Text style={styles.fareSub}>Thực nhận sau chiết khấu</Text>
      </View>
    </Card>
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
    <Card style={styles.routeBezelOuter}>
      <View style={styles.routeBezelInner}>
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
            <HStack style={styles.addressTitleRow}>
              <Text style={styles.addressTypeLabel}>Điểm lấy hàng</Text>
              {pickupBadgeText ? (
                <Badge action="info" variant="solid" style={styles.pickupDistBadge}>
                  <HStack space="hairline">
                    <IconLocationPin color={leopardPalette.primary} size={12} />
                    <Badge.Text style={styles.pickupDistText}>{pickupBadgeText}</Badge.Text>
                  </HStack>
                </Badge>
              ) : null}
            </HStack>
            <Text numberOfLines={2} style={styles.addressNameText}>
              {pickupDisplay}
            </Text>
          </View>

          {tripDistText ? (
            <HStack space="xs" style={styles.transitMetaRow}>
              <IconRoute color={colors.neutral.subtleText} size={13} />
              <Text style={styles.transitMetaText}>
                {etaLabel
                  ? `Lộ trình ${tripDistText} · Khoảng ${etaLabel}`
                  : `Lộ trình ${tripDistText}`}
              </Text>
            </HStack>
          ) : null}

          <View style={styles.addressBlock}>
            <Text style={styles.addressTypeLabelDropoff}>Điểm giao hàng</Text>
            <Text numberOfLines={2} style={styles.addressNameText}>
              {dropoffDisplay}
            </Text>
          </View>
        </View>
      </View>
    </Card>
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
    <Card style={styles.cargoBentoOuter} testID="cargo-bento-card">
      <View style={styles.cargoBentoInner}>
        <HStack style={styles.cargoHeaderRow}>
          <HStack space="xs" style={styles.cargoTitleRow}>
            <IconOrders color={leopardPalette.primary} size={15} />
            <Text style={styles.cargoHeaderTitle}>Thông tin hàng hóa</Text>
          </HStack>
          {vehicleLabel ? (
            <View style={styles.specChip} testID="dispatch-vehicle-spec-chip">
              <IconSpeedTruck color={leopardPalette.primary} size={14} />
              <Text style={styles.specChipText}>{vehicleLabel}</Text>
            </View>
          ) : null}
        </HStack>

        <View style={styles.cargoBodyRow}>
          <View style={styles.cargoInfoColumn}>
            <Text numberOfLines={2} style={styles.cargoNameText}>
              {cargoName}
            </Text>

            {(cargoWeightKg !== undefined || cargoDimensions) ? (
              <HStack space="xs" style={styles.cargoSpecsRow}>
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
              </HStack>
            ) : null}

            {loadingBadgeLabel ? (
              <Badge action="warning" variant="solid" style={styles.loadingFeeBadge}>
                <Badge.Text style={styles.loadingFeeBadgeText}>{loadingBadgeLabel}</Badge.Text>
              </Badge>
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
          <Box style={styles.notesBox}>
            <Text style={styles.notesText}>{specialNotes}</Text>
          </Box>
        ) : null}
      </View>
    </Card>
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
        onPress={() => onDecline(targetOrderId)}
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
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    height: '100%',
    width: '100%',
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
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
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radarPulseOuterUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  radarPulseCore: {
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  radarPulseCoreUrgent: {
    backgroundColor: colors.danger.text,
  },
  modalBadgeText: {
    color: leopardPalette.primaryDark,
    ...typeScale.caption1,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  modalBadgeTextUrgent: {
    color: colors.danger.text,
  },
  timerBadge: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primaryBorder,
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
    backgroundColor: colors.neutral.border,
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
  fareBezelOuter: {
    backgroundColor: '#F0F4FA',
    borderRadius: radius.bezelOuter,
    padding: spacing.hairline + 1,
  },
  fareBezelOuterUrgent: {
    backgroundColor: '#FCA5A5',
  },
  fareBezelInner: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: spacing.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fareBezelInnerUrgent: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECACA',
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
    paddingVertical: spacing.hairline,
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
    letterSpacing: 0.8,
  },
  fareAmount: {
    color: leopardPalette.primary,
    ...typeScale.largeTitle,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  fareSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    textAlign: 'center',
  },
  routeBezelOuter: {
    backgroundColor: colors.neutral.border,
    borderRadius: radius.bezelOuter,
    padding: spacing.hairline + 1,
  },
  routeBezelInner: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.surfaceMuted,
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + spacing.xxs,
  },
  routeSpineColumn: {
    alignItems: 'center',
    paddingTop: spacing.xxs,
    width: 16,
  },
  spineOriginCircle: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: radius.pill,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  spinePointTextA: {
    color: colors.neutral.surface,
    ...typeScale.caption2,
    fontWeight: '700',
    textAlign: 'center',
  },
  spineTrackDotted: {
    backgroundColor: leopardPalette.inputBorder,
    flex: 1,
    marginVertical: spacing.xxs,
    minHeight: 28,
    width: 2,
  },
  spineDestSquare: {
    alignItems: 'center',
    backgroundColor: colors.danger.text,
    borderRadius: 3,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  spinePointTextB: {
    color: colors.neutral.surface,
    ...typeScale.caption2,
    fontWeight: '700',
    textAlign: 'center',
  },
  routeAddressesColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  addressBlock: {
    gap: spacing.hairline,
  },
  addressTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    justifyContent: 'space-between',
  },
  addressTypeLabel: {
    color: '#16A34A',
    ...typeScale.caption2,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  addressTypeLabelDropoff: {
    color: colors.danger.text,
    ...typeScale.caption2,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  pickupDistBadge: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primaryBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.hairline + 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  pickupDistText: {
    color: leopardPalette.textSlateDark,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  addressNameText: {
    color: leopardPalette.textSlateDark,
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
    paddingVertical: spacing.hairline,
  },
  transitMetaText: {
    color: leopardPalette.textMutedSlate,
    ...typeScale.caption1,
  },
  cargoBentoOuter: {
    backgroundColor: colors.neutral.border,
    borderRadius: radius.bezelOuter,
    padding: spacing.hairline + 1,
  },
  cargoBentoInner: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.surfaceMuted,
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm + spacing.xxs,
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
    color: leopardPalette.primary,
    ...typeScale.caption2,
    fontWeight: '600',
    letterSpacing: 0.6,
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
    color: colors.neutral.text,
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
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.control / 2,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline + 1,
  },
  cargoSpecValue: {
    color: colors.neutral.text,
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
    paddingVertical: spacing.hairline + 1,
  },
  loadingFeeBadgeText: {
    color: '#1D4ED8',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  cargoThumbnailWrapper: {
    backgroundColor: colors.neutral.text,
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.cardSm,
    borderWidth: 1.5,
    height: 56,
    overflow: 'hidden',
    width: 56,
  },
  cargoThumbnailImage: {
    height: '100%',
    width: '100%',
  },
  notesBox: {
    backgroundColor: leopardPalette.accentYellowBg,
    borderColor: leopardPalette.accentYellowBorder,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  notesText: {
    color: leopardPalette.textMutedSlate,
    ...typeScale.caption1,
  },
  actionsContainer: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
    paddingTop: spacing.xxs,
  },
  declineButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  declineButtonPressed: {
    backgroundColor: colors.neutral.surfaceMuted,
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  declineButtonDisabled: {
    opacity: 0.5,
  },
  declineButtonText: {
    color: colors.neutral.subtleText,
    ...typeScale.subheadline,
    fontWeight: '600',
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
