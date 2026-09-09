import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, leopardElevation, leopardPalette, leopardRadius, spacing } from '@leopard/mobile-core';
import { IconPaymentConvenient } from './icons/CoreIcons';

export type AnalyticsHeroCardProps = Readonly<{
  balance: string;
  activeBookingsCount: number;
  aiEtaAccuracy: string;
  onTopUp?: () => void;
  onViewActiveBookings?: () => void;
}>;

function AnalyticsHeroCardComponent({
  activeBookingsCount,
  aiEtaAccuracy,
  balance,
  onTopUp,
  onViewActiveBookings,
}: AnalyticsHeroCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>SỐ DƯ VÍ VIETQR</Text>
          <Text style={styles.balanceValue}>{balance}</Text>
        </View>

        {onTopUp ? (
          <Pressable
            accessibilityLabel="Nạp tiền nhanh VietQR"
            accessibilityRole="button"
            onPress={onTopUp}
            style={({ pressed }) => [styles.topUpButton, pressed ? styles.pressed : null]}
          >
            <IconPaymentConvenient color="#FFFFFF" size={16} strokeWidth={2} />
            <Text style={styles.topUpText}>Nạp tiền</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <Pressable
          accessibilityLabel={`Có ${activeBookingsCount} chuyến đang vận chuyển`}
          accessibilityRole="button"
          onPress={onViewActiveBookings}
          style={({ pressed }) => [styles.bookingBadge, pressed ? styles.pressed : null]}
        >
          <View style={styles.liveIndicator} />
          <Text style={styles.bookingText}>{activeBookingsCount} chuyến đang chạy</Text>
        </Pressable>

        <View style={styles.aiEtaBadge}>
          <Text style={styles.aiEtaDot}>•</Text>
          <Text style={styles.aiEtaText}>AI ETA: {aiEtaAccuracy}</Text>
        </View>
      </View>
    </View>
  );
}

export const AnalyticsHeroCard = React.memo(AnalyticsHeroCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    borderRadius: leopardRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...leopardElevation.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceBlock: {
    gap: 2,
  },
  balanceLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  balanceValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: leopardPalette.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: leopardRadius.md,
  },
  topUpText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: leopardPalette.subtleDivider,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  bookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: leopardRadius.pill,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: leopardRadius.pill,
    backgroundColor: colors.success.text,
  },
  bookingText: {
    color: colors.success.text,
    fontSize: 12,
    fontWeight: '600',
  },
  aiEtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: leopardRadius.pill,
  },
  aiEtaDot: {
    color: colors.info.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 14,
  },
  aiEtaText: {
    color: colors.info.text,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
