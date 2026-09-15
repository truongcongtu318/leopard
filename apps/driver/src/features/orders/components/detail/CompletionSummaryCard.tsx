import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconCheck, IconOrders, IconWallet, spacing } from '@leopard/mobile-core';

export type CompletionSummaryCardProps = Readonly<{
  reference: string;
  priceLabel?: string;
  status: string;
  deliveredAtLabel?: string;
}>;

export function CompletionSummaryCard({
  reference,
  priceLabel,
  status,
  deliveredAtLabel,
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

      <View style={styles.earningsBox}>
        <View style={styles.earningsRow}>
          <View style={styles.earningsLeft}>
            <View style={styles.walletIcon}>
              <IconWallet color="#10B981" size={16} />
            </View>
            <View>
              <Text style={styles.earningsCaption}>CƯỚC THỰC NHẬN CHUYẾN ĐI</Text>
              <Text style={styles.earningsSub}>Cộng trực tiếp vào ví khả dụng</Text>
            </View>
          </View>
          <Text style={styles.earningsAmount}>{priceLabel || '285.000 ₫'}</Text>
        </View>
      </View>

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
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.md,
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
    backgroundColor: '#10B981',
  },
  iconReturned: {
    backgroundColor: '#64748B',
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    color: '#0B1E42',
    fontSize: 16,
    fontWeight: '800',
  },
  earningsBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  earningsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  walletIcon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  earningsCaption: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  earningsSub: {
    color: '#475569',
    fontSize: 10.5,
  },
  earningsAmount: {
    color: '#15803D',
    fontSize: 18,
    fontWeight: '800',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  metaTimestamp: {
    color: '#94A3B8',
    fontSize: 11,
  },
});
