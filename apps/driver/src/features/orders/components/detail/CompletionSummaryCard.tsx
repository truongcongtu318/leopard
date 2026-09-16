import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  driverPrimitives,
  iosContinuousCurve,
  IconCheck,
  IconOrders,
  IconWallet,
  NavigableMetricCard,
  spacing,
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, isDelivered ? styles.iconSuccess : styles.iconReturned]}>
          <IconCheck color="#FFFFFF" size={20} strokeWidth={2.5} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.eyebrow}>
            {isDelivered ? 'CHUYẾN ĐI ĐÃ HOÀN TẤT' : 'CHUYẾN ĐI ĐÃ HOÀN HÀNG'}
          </Text>
          <Text style={styles.title}>
            {isDelivered ? 'Giao hàng thành công' : 'Đã hoàn trả về điểm xuất phát'}
          </Text>
        </View>
      </View>

      {/* Shared NavigableMetricCard for payout */}
      <NavigableMetricCard
        hasChevron={false}
        layout="row"
        leadingIcon={<IconWallet color={driverPrimitives.colors.green500} size={20} />}
        subtitle="Cộng trực tiếp vào ví khả dụng"
        title="Cước thực nhận chuyến đi"
        value={priceLabel || '0 ₫'}
        valueTone="success"
      />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <IconOrders color="#64748B" size={13} />
          <Text style={styles.metaText}>Mã vận đơn: {reference}</Text>
        </View>
        {deliveredAtLabel ? (
          <Text style={styles.metaTimestamp}>{deliveredAtLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.md,
    ...driverPrimitives.shadows.sm,
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
  eyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metaText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  metaTimestamp: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
});
