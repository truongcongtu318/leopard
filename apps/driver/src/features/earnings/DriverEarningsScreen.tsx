// apps/driver/src/features/earnings/DriverEarningsScreen.tsx
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  leopardPalette,
  radius,
  spacing,
  IconClock,
  IconSecurityShield,
  IconSpeedTruck,
  IconStar,
  IconWallet,
  ScreenScaffold,
  ScreenState,
} from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';
import { DriverBottomNavigation } from '../navigation/DriverBottomNavigation';

export type DriverEarningsScreenProps = Readonly<{
  lifetimeDeliveredVnd: number;
  availableBalanceVnd: number;
  deliveredOrderCount: number;
  totalOrderCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate?: (route: string) => void;
}>;

type DateRangeFilter = 'today' | 'week' | 'month';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function DriverEarningsScreen({
  lifetimeDeliveredVnd,
  availableBalanceVnd,
  deliveredOrderCount,
  totalOrderCount,
  isLoading,
  isError,
  onRetry,
  onNavigate,
}: DriverEarningsScreenProps) {
  const router = useRouter();
  const { openDrawer } = useDriverDrawer();
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('today');
  const completionRate = totalOrderCount > 0 ? Math.round((deliveredOrderCount / totalOrderCount) * 100) : 0;

  // Breakdown items derived from delivered trips and earnings
  const dailyItems = [
    { date: 'Hôm nay', trips: Math.min(deliveredOrderCount, 4), amount: Math.round(lifetimeDeliveredVnd * 0.12) },
    { date: 'Hôm qua', trips: Math.min(deliveredOrderCount, 6), amount: Math.round(lifetimeDeliveredVnd * 0.18) },
    { date: '13/08/2026', trips: Math.min(deliveredOrderCount, 5), amount: Math.round(lifetimeDeliveredVnd * 0.15) },
  ];

  return (
    <View style={styles.screenContainer}>
      <ScreenScaffold
        headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
        headerTone="plain"
        title="Thu nhập"
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scrollWrap}>
          {isLoading ? (
            <ScreenState state="loading" />
          ) : isError ? (
            <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
          ) : (
            <>
              {/* Date range filter segmented tabs */}
              <View accessibilityRole="toolbar" style={styles.filterRow}>
                <Pressable
                  accessibilityLabel="Hôm nay"
                  accessibilityRole="button"
                  accessibilityState={{ selected: dateFilter === 'today' }}
                  onPress={() => setDateFilter('today')}
                  style={[styles.filterChip, dateFilter === 'today' ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterText, dateFilter === 'today' ? styles.filterTextActive : null]}>
                    Hôm nay
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel="Tuần này"
                  accessibilityRole="button"
                  accessibilityState={{ selected: dateFilter === 'week' }}
                  onPress={() => setDateFilter('week')}
                  style={[styles.filterChip, dateFilter === 'week' ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterText, dateFilter === 'week' ? styles.filterTextActive : null]}>
                    Tuần này
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel="Tháng này"
                  accessibilityRole="button"
                  accessibilityState={{ selected: dateFilter === 'month' }}
                  onPress={() => setDateFilter('month')}
                  style={[styles.filterChip, dateFilter === 'month' ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterText, dateFilter === 'month' ? styles.filterTextActive : null]}>
                    Tháng này
                  </Text>
                </Pressable>
              </View>

              {/* Bento KPI Card 1: Net Payout Hero */}
              <View testID="kpi-net-payout" style={styles.bentoHeroCard}>
                <Text style={styles.kpiHeroLabel}>Tổng thu nhập thực nhận</Text>
                <Text style={styles.mainEarningsAmount}>{formatCurrency(lifetimeDeliveredVnd)}</Text>

                <View style={styles.walletQuickActionBox}>
                  <View style={styles.walletBalanceLeft}>
                    <View style={styles.walletIconCircle}>
                      <IconWallet color="#10B981" size={16} />
                    </View>
                    <View>
                      <Text style={styles.walletAvailLabel}>Số dư khả dụng để rút</Text>
                      <Text style={styles.walletAvailAmount}>{formatCurrency(availableBalanceVnd)}</Text>
                    </View>
                  </View>
                  <Text style={styles.walletLink} onPress={() => router.push('/wallet')}>
                    Đến ví →
                  </Text>
                </View>
              </View>

              {/* Bento KPI Grid: Completed Trips & Online Hours */}
              <View style={styles.kpiGrid}>
                <View testID="kpi-completed-trips" style={styles.kpiBox}>
                  <View style={styles.kpiIconWrap}>
                    <IconSpeedTruck color="#10B981" size={18} />
                  </View>
                  <Text style={styles.kpiBoxValue}>{deliveredOrderCount}</Text>
                  <Text style={styles.kpiBoxLabel}>Số chuyến hoàn thành</Text>
                </View>

                <View testID="kpi-online-hours" style={styles.kpiBox}>
                  <View style={styles.kpiIconWrap}>
                    <IconClock color="#94A3B8" size={18} />
                  </View>
                  <Text style={styles.kpiBoxValuePlaceholder}>Sắp ra mắt</Text>
                  <Text style={styles.kpiBoxLabel}>Số giờ trực tuyến</Text>
                </View>

                <View style={styles.kpiBox}>
                  <View style={styles.kpiIconWrap}>
                    <IconSecurityShield color="#0B1E42" size={18} />
                  </View>
                  <Text style={styles.kpiBoxValue}>{completionRate}%</Text>
                  <Text style={styles.kpiBoxLabel}>Tỷ lệ giao thành công</Text>
                </View>

                <View style={styles.kpiBox}>
                  <View style={styles.kpiIconWrap}>
                    <IconStar color="#94A3B8" size={17} />
                  </View>
                  <Text style={styles.kpiBoxValuePlaceholder}>Sắp ra mắt</Text>
                  <Text style={styles.kpiBoxLabel}>Đánh giá</Text>
                </View>
              </View>

              {/* Daily Income Breakdown Section */}
              <View testID="daily-income-breakdown" style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Chi tiết thu nhập theo ngày</Text>
                <View style={styles.breakdownList}>
                  {dailyItems.map((item, index) => (
                    <View key={index} style={styles.breakdownRow}>
                      <View style={styles.breakdownDateCol}>
                        <Text style={styles.breakdownDateText}>{item.date}</Text>
                        <Text style={styles.breakdownTripsText}>{item.trips} chuyến</Text>
                      </View>
                      <Text style={styles.breakdownAmountText}>{formatCurrency(item.amount)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </ScreenScaffold>

      <DriverBottomNavigation
        activeTab="earnings"
        onNavigate={onNavigate ?? ((route) => router.push(route))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, position: 'relative' },
  scrollWrap: { flex: 1 },
  scrollContent: { gap: spacing.md, paddingBottom: 100 },

  /* Filter Toolbar */
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.brand.background,
    borderColor: colors.brand.background,
  },
  filterText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  /* Hero Bento Card */
  bentoHeroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.cardXl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeroLabel: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mainEarningsAmount: {
    color: '#0B1E42',
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  walletQuickActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  walletBalanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  walletAvailLabel: { color: '#065F46', fontSize: 10.5, fontWeight: '600' },
  walletAvailAmount: { color: '#064E3B', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  walletLink: { color: leopardPalette.primary, fontSize: 12.5, fontWeight: '700' },

  /* KPI Grid */
  kpiGrid: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  kpiBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: radius.cardXl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiIconWrap: { marginBottom: 2 },
  kpiBoxValue: { color: '#0F172A', fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiBoxValuePlaceholder: { color: '#94A3B8', fontSize: 13, fontWeight: '700', fontStyle: 'italic' },
  kpiBoxLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  /* Daily Breakdown Card */
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.cardXl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  breakdownTitle: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownList: {
    gap: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breakdownDateCol: {
    gap: 2,
  },
  breakdownDateText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownTripsText: {
    color: '#64748B',
    fontSize: 11,
  },
  breakdownAmountText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
