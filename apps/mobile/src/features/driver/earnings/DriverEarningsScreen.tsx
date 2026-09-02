import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

type EarningsTrip = {
  id: string;
  reference: string;
  completedAt: string;
  fare: number;
  tip: number;
  bonus: number;
  total: number;
};

const mockTrips: EarningsTrip[] = [
  {
    id: 't-1',
    reference: 'LP-D-260815-001',
    completedAt: '14:32',
    fare: 150000,
    tip: 20000,
    bonus: 0,
    total: 170000,
  },
  {
    id: 't-2',
    reference: 'LP-D-260815-002',
    completedAt: '11:15',
    fare: 220000,
    tip: 0,
    bonus: 30000,
    total: 250000,
  },
  {
    id: 't-3',
    reference: 'LP-D-260815-003',
    completedAt: '09:40',
    fare: 120000,
    tip: 20000,
    bonus: 0,
    total: 140000,
  },
  {
    id: 't-4',
    reference: 'LP-D-260815-004',
    completedAt: '08:10',
    fare: 60000,
    tip: 0,
    bonus: 0,
    total: 60000,
  },
];

export function DriverEarningsScreen() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const totalEarnings = mockTrips.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <ScreenScaffold
      eyebrow="DRIVER · EARNINGS & PAYOUT"
      headerTone="ink"
      subtitle="Báo cáo thu nhập, cước chuyến, tiền tip và thưởng hiệu suất."
      title="Thu nhập"
    >
      <View style={styles.container}>
        <View accessibilityRole="toolbar" style={styles.periodRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: period === 'today' }}
            onPress={() => setPeriod('today')}
            style={[styles.periodChip, period === 'today' ? styles.periodChipActive : null]}
          >
            <Text style={[styles.periodText, period === 'today' ? styles.periodTextActive : null]}>
              Hôm nay
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: period === 'week' }}
            onPress={() => setPeriod('week')}
            style={[styles.periodChip, period === 'week' ? styles.periodChipActive : null]}
          >
            <Text style={[styles.periodText, period === 'week' ? styles.periodTextActive : null]}>
              Tuần này
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: period === 'month' }}
            onPress={() => setPeriod('month')}
            style={[styles.periodChip, period === 'month' ? styles.periodChipActive : null]}
          >
            <Text style={[styles.periodText, period === 'month' ? styles.periodTextActive : null]}>
              Tháng này
            </Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>TỔNG THỰC NHẬN ({period === 'today' ? 'HÔM NAY' : period === 'week' ? 'TUẦN NÀY' : 'THÁNG NÀY'})</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalEarnings)}</Text>
          <View style={styles.statGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Số chuyến</Text>
              <Text style={styles.statValue}>4 chuyến</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Online</Text>
              <Text style={styles.statValue}>5.5 giờ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tiền tip</Text>
              <Text style={styles.statValue}>40.000 ₫</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Thưởng</Text>
              <Text style={styles.statValue}>30.000 ₫</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>CHI TIẾT CÁC CHUYẾN ĐÃ HOÀN TẤT</Text>

        <FlatList
          contentContainerStyle={styles.tripList}
          data={mockTrips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View>
                  <Text style={styles.tripRef}>{item.reference}</Text>
                  <Text style={styles.tripTime}>Hoàn tất lúc {item.completedAt}</Text>
                </View>
                <Text style={styles.tripTotal}>{formatCurrency(item.total)}</Text>
              </View>
              <View style={styles.tripBreakdown}>
                <Text style={styles.breakdownText}>
                  Cước: {formatCurrency(item.fare)}
                  {item.tip > 0 ? ` · Tip: +${formatCurrency(item.tip)}` : ''}
                  {item.bonus > 0 ? ` · Thưởng: +${formatCurrency(item.bonus)}` : ''}
                </Text>
              </View>
            </View>
          )}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  periodChip: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: colors.brand.background,
  },
  periodText: {
    color: colors.neutral.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  periodTextActive: {
    color: colors.neutral.background,
  },
  summaryCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  summaryEyebrow: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  totalAmount: {
    color: colors.neutral.titleText,
    fontSize: 28,
    fontWeight: '800',
  },
  statGrid: {
    borderTopColor: colors.neutral.rowDivider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: spacing.sm,
  },
  statItem: {
    gap: 2,
  },
  statLabel: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  statValue: {
    color: colors.neutral.titleText,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: spacing.xxs,
  },
  tripList: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  tripCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    padding: spacing.md,
  },
  tripHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripRef: {
    color: colors.neutral.titleText,
    fontSize: 14.5,
    fontWeight: '700',
  },
  tripTime: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
  },
  tripTotal: {
    color: colors.brand.background,
    fontSize: 16,
    fontWeight: '800',
  },
  tripBreakdown: {
    borderTopColor: colors.neutral.rowDivider,
    borderTopWidth: 1,
    paddingTop: 4,
  },
  breakdownText: {
    color: colors.neutral.mutedText,
    fontSize: 12,
  },
});
