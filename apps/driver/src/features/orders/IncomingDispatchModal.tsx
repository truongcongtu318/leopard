import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DriverModalSurface } from '../../navigation/DriverModalSurface';

import {
  leopardPalette,
  radius,
  spacing,
  IconClock,
  IconClose,
  IconLocationPin,
  IconOrders,
  IconRoute,
  IconSpeedTruck,
  RealInteractiveMap,
  SlideToAction,
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
}>;

export function IncomingDispatchModal({
  isAccepting = false,
  offer,
  onAccept,
  onDecline,
  visible,
}: IncomingDispatchModalProps) {
  const targetOrderId = offer?.orderId ?? offer?.id ?? '';

  const calculateSecondsLeft = () => {
    if (offer?.expiresAtEpochMs) {
      return Math.max(0, Math.ceil((offer.expiresAtEpochMs - Date.now()) / 1000));
    }
    return offer?.timeoutSeconds ?? 15;
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateSecondsLeft);
  const [totalDuration, setTotalDuration] = useState(calculateSecondsLeft);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  useEffect(() => {
    if (!visible || !offer) return;
    const initial = calculateSecondsLeft();
    setSecondsLeft(initial);
    setTotalDuration(Math.max(1, initial));

    const timer = setInterval(() => {
      if (offer.expiresAtEpochMs) {
        const remaining = Math.max(0, Math.ceil((offer.expiresAtEpochMs - Date.now()) / 1000));
        if (remaining <= 0) {
          clearInterval(timer);
          setSecondsLeft(0);
          onDecline(targetOrderId);
        } else {
          setSecondsLeft(remaining);
        }
      } else {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onDecline(targetOrderId);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, offer?.orderId, offer?.id, offer?.expiresAtEpochMs, offer?.timeoutSeconds, targetOrderId, onDecline]);

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
        <View style={styles.sheetContainer}>
          {/* 1. Header Bar with Radar Pulse, Title, Countdown, and Decline ("Từ chối") Button */}
          <View style={styles.modalHeader}>
            <View style={styles.radarPulseContainer}>
              <View style={[styles.radarPulseOuter, isUrgent ? styles.radarPulseOuterUrgent : null]}>
                <View style={[styles.radarPulseCore, isUrgent ? styles.radarPulseCoreUrgent : null]} />
              </View>
              <Text style={[styles.modalBadgeText, isUrgent ? styles.modalBadgeTextUrgent : null]}>
                ĐƠN HÀNG MỚI TRONG KHU VỰC
              </Text>
            </View>
            <View style={styles.modalHeaderRight}>
              <View
                style={[
                  styles.timerBadge,
                  isUrgent ? styles.timerBadgeUrgent : isWarning ? styles.timerBadgeWarning : null,
                ]}
              >
                <IconClock color={isUrgent ? '#DC2626' : isWarning ? '#D97706' : '#0B1E42'} size={14} />
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
                hitSlop={8}
                onPress={() => onDecline(targetOrderId)}
                style={styles.modalCloseBtn}
                testID="dispatch-modal-decline-top"
              >
                <IconClose color="#64748B" size={16} />
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
            />
          </View>

          {/* 3. Hero Mini Route Map */}
          <View style={styles.modalMapCanvas} testID="dispatch-modal-map">
            <RealInteractiveMap
              destination={{ label: offer.dropoffAddress, coords: offer.dropoffCoords }}
              height="100%"
              mode="route"
              origin={{ label: offer.pickupAddress, coords: offer.pickupCoords }}
            />
            {pickupDistText ? (
              <View style={styles.mapFloatingDistancePill}>
                <IconLocationPin color="#0B1E42" size={12} />
                <Text style={styles.mapFloatingDistanceText}>
                  Điểm đón · {pickupDistText}
                </Text>
              </View>
            ) : null}
          </View>

          {/* 4. Fare Card - High Prominence Double-Bezel (Mega Price) */}
          <View style={[styles.fareBezelOuter, isUrgent ? styles.fareBezelOuterUrgent : null]}>
            <View style={[styles.fareBezelInner, isUrgent ? styles.fareBezelInnerUrgent : null]}>
              <View style={styles.fareHeaderRow}>
                <Text style={styles.fareCaption}>CƯỚC THỰC NHẬN DỰ KIẾN</Text>
                <View style={styles.fareNetPill}>
                  <Text style={styles.fareNetPillText}>Thu nhập ròng</Text>
                </View>
              </View>
              <Text style={styles.fareAmount}>{fareAmount}</Text>
              <Text style={styles.fareSub}>Đã khấu trừ phí nền tảng · Nhận vào ví ngay khi hoàn tất</Text>
            </View>
          </View>

          {/* 5. Route Spine: Pickup -> Dropoff Double-Bezel */}
          <View style={styles.routeBezelOuter}>
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
                {/* Pickup Point */}
                <View style={styles.addressBlock}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressTypeLabel}>ĐIỂM LẤY HÀNG</Text>
                    {pickupBadgeText ? (
                      <View style={styles.pickupDistBadge}>
                        <IconLocationPin color="#0B1E42" size={12} />
                        <Text style={styles.pickupDistText}>
                          {pickupBadgeText}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={2} style={styles.addressNameText}>
                    {pickupDisplay}
                  </Text>
                </View>

                {/* Transit Indicator */}
                {tripDistText ? (
                  <View style={styles.transitMetaRow}>
                    <IconRoute color="#64748B" size={13} />
                    <Text style={styles.transitMetaText}>
                      {offer.etaLabel
                        ? `Lộ trình ${tripDistText} · Khoảng ${offer.etaLabel}`
                        : `Lộ trình ${tripDistText}`}
                    </Text>
                  </View>
                ) : null}

                {/* Dropoff Point */}
                <View style={styles.addressBlock}>
                  <Text style={styles.addressTypeLabelDropoff}>ĐIỂM GIAO HÀNG</Text>
                  <Text numberOfLines={2} style={styles.addressNameText}>
                    {dropoffDisplay}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 6. Cargo Bento Card: Cargo specs, loading fee badge, thumbnail, notes */}
          <View style={styles.cargoBentoOuter} testID="cargo-bento-card">
            <View style={styles.cargoBentoInner}>
              <View style={styles.cargoHeaderRow}>
                <View style={styles.cargoTitleRow}>
                  <IconOrders color="#0B1E42" size={15} />
                  <Text style={styles.cargoHeaderTitle}>THÔNG TIN HÀNG HÓA</Text>
                </View>
                {offer.vehicleLabel ? (
                  <View style={styles.specChip} testID="dispatch-vehicle-spec-chip">
                    <IconSpeedTruck color="#0B1E42" size={14} />
                    <Text style={styles.specChipText}>{offer.vehicleLabel}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cargoBodyRow}>
                <View style={styles.cargoInfoColumn}>
                  <Text numberOfLines={2} style={styles.cargoNameText}>
                    {cargoName}
                  </Text>

                  {/* Specs: Weight and Dimensions */}
                  {(offer.cargoWeightKg !== undefined || offer.cargoDimensions) ? (
                    <View style={styles.cargoSpecsRow}>
                      {offer.cargoWeightKg !== undefined ? (
                        <View style={styles.cargoSpecPill}>
                          <Text style={styles.cargoSpecValue}>{offer.cargoWeightKg} kg</Text>
                        </View>
                      ) : null}
                      {offer.cargoDimensions ? (
                        <View style={styles.cargoSpecPill}>
                          <Text style={styles.cargoSpecValue}>{offer.cargoDimensions}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Loading Fee Badge */}
                  {loadingBadgeLabel ? (
                    <View style={styles.loadingFeeBadge}>
                      <Text style={styles.loadingFeeBadgeText}>{loadingBadgeLabel}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Cargo Photo Thumbnail (if provided) */}
                {offer.cargoPhotoUrl ? (
                  <Pressable
                    accessibilityHint="Chạm để phóng to xem chi tiết hàng hóa"
                    accessibilityLabel="Xem ảnh hàng hóa"
                    accessibilityRole="button"
                    onPress={() => setPhotoPreviewOpen(true)}
                    style={styles.cargoThumbnailWrapper}
                    testID="cargo-photo-thumbnail"
                  >
                    <Image
                      accessibilityLabel="Ảnh hàng hóa"
                      source={{ uri: offer.cargoPhotoUrl }}
                      style={styles.cargoThumbnailImage}
                    />
                  </Pressable>
                ) : null}
              </View>

              {/* Special Notes */}
              {specialNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{specialNotes}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* 7. Action Controls: SlideToAction (Vuốt nhận cuốc) + Decline Button (Bỏ qua) */}
          <View style={styles.actionsContainer}>
            <SlideToAction
              key={targetOrderId}
              resetKey={targetOrderId}
              colorVariant="success"
              disabled={isAccepting}
              label="Vuốt để nhận cuốc ➔"
              onActionComplete={() => onAccept(targetOrderId)}
              testID="dispatch-slide-action"
            />
            <Pressable
              accessibilityHint="Bỏ qua đơn hàng này"
              accessibilityLabel="Bỏ qua"
              accessibilityRole="button"
              disabled={isAccepting}
              hitSlop={8}
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
                hitSlop={12}
                onPress={() => setPhotoPreviewOpen(false)}
                style={styles.previewCloseBtn}
                testID="cargo-photo-preview-close"
              >
                <IconClose color="#FFFFFF" size={18} />
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

const styles = StyleSheet.create({
  scrimOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 24,
    gap: spacing.sm,
    paddingBottom: spacing.xl + 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  modalHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  radarPulseContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  radarPulseOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radarPulseOuterUrgent: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
  },
  radarPulseCore: {
    backgroundColor: leopardPalette.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  radarPulseCoreUrgent: {
    backgroundColor: '#DC2626',
  },
  modalBadgeText: {
    color: leopardPalette.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  modalBadgeTextUrgent: {
    color: '#DC2626',
  },
  timerBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerBadgeWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  timerBadgeUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  timerText: {
    color: '#061226',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  timerWarning: {
    color: '#D97706',
  },
  timerUrgent: {
    color: '#DC2626',
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    borderRadius: 3,
    height: '100%',
  },
  progressBarNormal: {
    backgroundColor: leopardPalette.primary,
  },
  progressBarWarning: {
    backgroundColor: '#F59E0B',
  },
  progressBarUrgent: {
    backgroundColor: '#DC2626',
  },
  modalMapCanvas: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    height: 160,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mapFloatingDistancePill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 8,
    elevation: 3,
    flexDirection: 'row',
    gap: 4,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    zIndex: 10,
  },
  mapFloatingDistanceText: {
    color: '#061226',
    fontSize: 11,
    fontWeight: '800',
  },
  fareBezelOuter: {
    backgroundColor: '#86EFAC',
    borderRadius: radius.bezelOuter,
    padding: 3,
  },
  fareBezelOuterUrgent: {
    backgroundColor: '#FCA5A5',
  },
  fareBezelInner: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  fareBezelInnerUrgent: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECACA',
  },
  fareHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  fareNetPill: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  fareNetPillText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  fareCaption: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fareAmount: {
    color: '#166534',
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  fareSub: {
    color: '#4B5563',
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  routeBezelOuter: {
    backgroundColor: '#E2E8F0',
    borderRadius: radius.bezelOuter,
    padding: 2.5,
  },
  routeBezelInner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.sm + 2,
  },
  routeSpineColumn: {
    alignItems: 'center',
    paddingTop: 4,
    width: 16,
  },
  spineOriginCircle: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  spinePointTextA: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  spineTrackDotted: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: 4,
    minHeight: 28,
    width: 2,
  },
  spineDestSquare: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 3,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  spinePointTextB: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  routeAddressesColumn: {
    flex: 1,
    gap: 8,
  },
  addressBlock: {
    gap: 2,
  },
  addressTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
  },
  addressTypeLabel: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  addressTypeLabelDropoff: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pickupDistBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pickupDistText: {
    color: '#061226',
    fontSize: 11,
    fontWeight: '800',
  },
  addressNameText: {
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  transitMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  transitMetaText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
    fontWeight: '600',
  },
  cargoBentoOuter: {
    backgroundColor: '#E2E8F0',
    borderRadius: radius.bezelOuter,
    padding: 2.5,
  },
  cargoBentoInner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: 8,
    padding: spacing.sm + 2,
  },
  cargoHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cargoTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cargoHeaderTitle: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cargoBodyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cargoInfoColumn: {
    flex: 1,
    gap: 6,
  },
  cargoNameText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  cargoSpecsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cargoSpecPill: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  cargoSpecValue: {
    color: '#0F172A',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  loadingFeeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  loadingFeeBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
  },
  cargoThumbnailWrapper: {
    backgroundColor: '#0F172A',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 56,
    overflow: 'hidden',
    width: 56,
  },
  cargoThumbnailImage: {
    height: '100%',
    width: '100%',
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
    left: 20,
    position: 'absolute',
    right: 20,
    top: 48,
    zIndex: 10,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  specChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  notesBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  notesText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 8,
    marginTop: spacing.xs,
    paddingTop: 4,
  },
  declineButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  declineButtonPressed: {
    backgroundColor: '#F1F5F9',
    opacity: 0.8,
  },
  declineButtonDisabled: {
    opacity: 0.5,
  },
  declineButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
});
