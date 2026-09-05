import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
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
  IconRoute,
  IconSpeedTruck,
} from '../../../ui/icons/CoreIcons';

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
          {/* Header Bar with Radar Pulse and Title */}
          <View style={styles.modalHeader}>
            <View style={styles.radarPulseContainer}>
              <View style={styles.radarPulseOuter}>
                <View style={styles.radarPulseCore} />
              </View>
              <Text style={styles.modalBadgeText}>ĐƠN HÀNG MỚI TRONG KHU VỰC</Text>
            </View>
            <View style={styles.timerBadge}>
              <IconClock color={isUrgent ? '#EF4444' : '#F59E0B'} size={13} />
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

          {/* Countdown Progress Bar */}
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

          {/* Fare Card - High Prominence */}
          <View style={styles.fareContainer}>
            <Text style={styles.fareCaption}>CƯỚC THỰC NHẬN DỰ KIẾN</Text>
            <Text style={styles.fareAmount}>{offer.priceLabel}</Text>
            <Text style={styles.fareSub}>Đã khấu trừ phí nền tảng · Nhận vào ví ngay khi hoàn tất</Text>
          </View>

          {/* Route Spine: Pickup -> Dropoff */}
          <View style={styles.routeContainer}>
            <View style={styles.routeSpineColumn}>
              <View style={styles.spineOriginCircle} />
              <View style={styles.spineTrackDotted} />
              <View style={styles.spineDestSquare} />
            </View>

            <View style={styles.routeAddressesColumn}>
              {/* Pickup Point */}
              <View style={styles.addressBlock}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressTypeLabel}>ĐIỂM LẤY HÀNG</Text>
                  <View style={styles.pickupDistBadge}>
                    <IconLocationPin color="#0284C7" size={11} />
                    <Text style={styles.pickupDistText}>Cách bạn {offer.pickupDistanceLabel}</Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.addressNameText}>
                  {offer.pickupAddress}
                </Text>
              </View>

              {/* Transit Indicator */}
              <View style={styles.transitMetaRow}>
                <IconRoute color="#64748B" size={12} />
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

          {/* Vehicle & Cargo Chips */}
          <View style={styles.chipsRow}>
            <View style={styles.specChip}>
              <IconSpeedTruck color="#0284C7" size={14} />
              <Text style={styles.specChipText}>{offer.vehicleLabel}</Text>
            </View>
            <View style={styles.specChip}>
              <IconOrders color="#475569" size={14} />
              <Text style={styles.specChipText}>{offer.cargoSummary}</Text>
            </View>
          </View>

          {offer.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{offer.notes}</Text>
            </View>
          ) : null}

          {/* Action Buttons: Decline (Bỏ qua) + Accept (Nhận ngay) */}
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  radarPulseContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  radarPulseOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  radarPulseCore: {
    backgroundColor: leopardPalette.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  modalBadgeText: {
    color: leopardPalette.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  timerBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timerText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '800',
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
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  progressBarNormal: {
    backgroundColor: leopardPalette.primary,
  },
  progressBarWarning: {
    backgroundColor: '#F59E0B',
  },
  progressBarUrgent: {
    backgroundColor: '#EF4444',
  },
  fareContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  fareCaption: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  fareAmount: {
    color: leopardPalette.textSlateDark,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  fareSub: {
    color: leopardPalette.textSubtle,
    fontSize: 11,
    textAlign: 'center',
  },
  routeContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.sm,
    gap: 10,
  },
  routeSpineColumn: {
    alignItems: 'center',
    paddingTop: 4,
    width: 14,
  },
  spineOriginCircle: {
    backgroundColor: '#16A34A',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  spineTrackDotted: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: 4,
    minHeight: 28,
    width: 2,
  },
  spineDestSquare: {
    backgroundColor: '#EF4444',
    borderRadius: 2,
    height: 10,
    width: 10,
  },
  routeAddressesColumn: {
    flex: 1,
    gap: 6,
  },
  addressBlock: {
    gap: 2,
  },
  addressTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
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
    backgroundColor: '#F0F9FF',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pickupDistText: {
    color: '#0369A1',
    fontSize: 10.5,
    fontWeight: '700',
  },
  addressNameText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  transitMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 2,
  },
  transitMetaText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  specChip: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  specChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notesText: {
    color: '#92400E',
    fontSize: 11.5,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xs,
  },
  declineButtonWrap: {
    flex: 1,
  },
  acceptButtonWrap: {
    flex: 2,
  },
});
