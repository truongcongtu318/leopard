import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  IconCheck,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  typeScale,
} from '@leopard/mobile-core';

export type CompletionSummaryCardProps = Readonly<{
  reference: string;
  priceLabel?: string;
  status: string;
  deliveredAtLabel?: string;
}>;

export function CompletionSummaryCard({
  deliveredAtLabel,
  priceLabel,
  reference,
  status,
}: CompletionSummaryCardProps) {
  const isDelivered = status === 'DELIVERED';

  return (
    <View style={styles.cardContainer}>
      {/* Top row: Status pill on left, reference code on right */}
      <View style={styles.headerRow}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot}>
            <IconCheck color="#059669" size={11} strokeWidth={2.5} />
          </View>
          <Text style={styles.statusText}>
            {isDelivered ? 'Giao hàng thành công' : 'Đã hoàn trả về điểm xuất phát'}
          </Text>
        </View>

        <View style={styles.referencePill}>
          <Text style={styles.referenceText}>{reference}</Text>
        </View>
      </View>

      {/* Hero Payout Amount */}
      <View style={styles.payoutBlock}>
        <Text style={styles.payoutLabel}>TIỀN CƯỚC THỰC NHẬN</Text>
        <Text style={styles.priceValue}>{priceLabel || '0 ₫'}</Text>
      </View>

      {/* Footer: Delivered timestamp */}
      {deliveredAtLabel ? (
        <View style={styles.footerRow}>
          <Text style={styles.metaTimestamp}>Hoàn tất lúc: {deliveredAtLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    ...driverPrimitives.shadows.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    ...typeScale.caption1,
    color: driverPrimitives.colors.green700,
    fontWeight: '600',
  },
  referencePill: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  referenceText: {
    ...typeScale.caption2,
    color: colors.neutral.mutedText,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  payoutBlock: {
    gap: 2,
    paddingTop: 2,
  },
  payoutLabel: {
    ...typeScale.caption2,
    color: driverPrimitives.colors.gray400,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  priceValue: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.largeTitle,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  footerRow: {
    borderTopColor: driverPrimitives.colors.gray100,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  metaTimestamp: {
    ...typeScale.caption1,
    color: colors.neutral.mutedText,
  },
});
