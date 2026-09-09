import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import {
  IconClock,
  IconLocationPin,
  IconOrders,
  IconRadarPulse,
  IconRoute,
  IconSpeedTruck,
} from '../../../ui/icons/CoreIcons';
import { RealInteractiveMap } from '../../../ui/RealInteractiveMap';

export type IncomingDispatchOffer = Readonly<{
  id: string;
  reference: string;
  pickupDistanceLabel: string;
  pickupAddress: string;
  dropoffAddress: string;
  tripDistanceLabel: string;
  etaLabel: string;
  priceLabel: string;
  vehicleLabel: string;
  cargoSummary: string;
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
  const initialSeconds = offer?.timeoutSeconds ?? 25;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!visible || !offer) return;
    setSecondsLeft(initialSeconds);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline(offer.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, offer, initialSeconds, onDecline]);

  if (!visible || !offer) return null;

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / initialSeconds) * 100));
  const isUrgent = secondsLeft <= 5;
  const isWarning = secondsLeft <= 10 && !isUrgent;

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      statusBarTranslucent
      testID="incoming-dispatch-modal"
      transparent
      visible={visible}
    >
      <View style={styles.scrimOverlay}>
        <View style={styles.sheetContainer}>
          {/* 1. Header Bar with Radar Pulse and Title */}
          <View style={styles.modalHeader}>
            <View style={styles.radarPulseContainer}>
              <View style={[styles.radarPulseOuter, isUrgent ? styles.radarPulseOuterUrgent : null]}>
                <View style={[styles.radarPulseCore, isUrgent ? styles.radarPulseCoreUrgent : null]} />
              </View>
              <Text style={[styles.modalBadgeText, isUrgent ? styles.modalBadgeTextUrgent : null]}>
                ĐƠN HÀNG MỚI TRONG KHU VỰC
              </Text>
            </View>
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
              destination={{ label: offer.dropoffAddress }}
              height="100%"
              mode="route"
              origin={{ label: offer.pickupAddress }}
            />
            <View style={styles.mapFloatingDistancePill}>
              <IconLocationPin color="#0B1E42" size={12} />
              <Text style={styles.mapFloatingDistanceText}>
                Điểm đón · {offer.pickupDistanceLabel}
              </Text>
            </View>
          </View>

          {/* 4. Fare Card - High Prominence (Mega Price) */}
          <View style={[styles.fareContainer, isUrgent ? styles.fareContainerUrgent : null]}>
            <View style={styles.fareHeaderRow}>
              <Text style={styles.fareCaption}>CƯỚC THỰC NHẬN DỰ KIẾN</Text>
              <View style={styles.fareNetPill}>
                <Text style={styles.fareNetPillText}>Thu nhập ròng</Text>
              </View>
            </View>
            <Text style={styles.fareAmount}>{offer.priceLabel}</Text>
            <Text style={styles.fareSub}>Đã khấu trừ phí nền tảng · Nhận vào ví ngay khi hoàn tất</Text>
          </View>

          {/* 5. Route Spine: Pickup -> Dropoff */}
          <View style={styles.routeContainer}>
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
                  <View style={styles.pickupDistBadge}>
                    <IconLocationPin color="#0B1E42" size={12} />
                    <Text style={styles.pickupDistText}>
                      {offer.pickupDistanceLabel.startsWith('Cách bạn')
                        ? offer.pickupDistanceLabel
                        : `Cách bạn ${offer.pickupDistanceLabel}`}
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.addressNameText}>
                  {offer.pickupAddress}
                </Text>
              </View>

              {/* Transit Indicator */}
              <View style={styles.transitMetaRow}>
                <IconRoute color="#64748B" size={13} />
                <Text style={styles.transitMetaText}>
                  Lộ trình {offer.tripDistanceLabel} · Khoảng {offer.etaLabel}
                </Text>
              </View>

              {/* Dropoff Point */}
              <View style={styles.addressBlock}>
                <Text style={styles.addressTypeLabelDropoff}>ĐIỂM GIAO HÀNG</Text>
                <Text numberOfLines={2} style={styles.addressNameText}>
                  {offer.dropoffAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* 6. Vehicle & Cargo Chips */}
          <View style={styles.chipsRow}>
            <View style={styles.specChip}>
              <IconSpeedTruck color="#0B1E42" size={15} />
              <Text style={styles.specChipText}>{offer.vehicleLabel}</Text>
            </View>
            <View style={styles.specChip}>
              <IconOrders color="#475569" size={15} />
              <Text numberOfLines={1} style={styles.specChipText}>{offer.cargoSummary}</Text>
            </View>
          </View>

          {offer.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{offer.notes}</Text>
            </View>
          ) : null}

          {/* 7. Action Buttons: Decline (Bỏ qua) + Accept (Nhận ngay) */}
          <View style={styles.actionsRow}>
            <View style={styles.declineButtonWrap}>
              <Button
                disabled={isAccepting}
                label="Bỏ qua"
                onPress={() => onDecline(offer.id)}
                variant="secondary"
              />
            </View>
            <View style={styles.acceptButtonWrap}>
              <Button
                disabled={isAccepting}
                isLoading={isAccepting}
                label="NHẬN ĐƠN NGAY"
                loadingLabel="Đang phân công..."
                onPress={() => onAccept(offer.id)}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.xl + 8,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
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
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
    height: '100%',
    borderRadius: 3,
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
  fareContainer: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  fareContainerUrgent: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
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
    fontWeight: '900',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  fareSub: {
    color: '#4B5563',
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  routeContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.sm + 2,
    gap: 12,
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
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
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  specChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  specChipText: {
    color: '#334155',
    fontSize: 12.5,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.xs,
    paddingTop: 4,
  },
  declineButtonWrap: {
    flex: 1,
  },
  acceptButtonWrap: {
    flex: 2,
  },
});
