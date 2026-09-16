import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconCheck, spacing } from '@leopard/mobile-core';

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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, isDelivered ? styles.iconSuccess : styles.iconReturned]}>
          <IconCheck color="#FFFFFF" size={20} strokeWidth={2.5} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>
            {isDelivered ? 'Giao hàng thành công' : 'Đã hoàn trả về điểm xuất phát'}
          </Text>
          <Text style={styles.metaTimestamp}>
            {deliveredAtLabel ? `${deliveredAtLabel} · ` : ''}Mã vận đơn: {reference}
          </Text>
        </View>
        <Text style={styles.priceValue}>{priceLabel || '0 ₫'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconSuccess: {
    backgroundColor: '#16A34A',
  },
  iconReturned: {
    backgroundColor: '#0284C7',
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  priceValue: {
    color: '#16A34A',
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metaTimestamp: {
    color: '#64748B',
    fontSize: 12,
  },
});
