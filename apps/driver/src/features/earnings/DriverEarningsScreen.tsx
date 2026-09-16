// apps/driver/src/features/earnings/DriverEarningsScreen.tsx
import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  IconChevronRight,
  IconEarnings,
  IconSpeedTruck,
  IconSupport247,
  IconWallet,
  ScreenScaffold,
  ScreenState,
  SkeletonCard,
  colors,
  driverPrimitives,
  iosContinuousCurve,
} from '@leopard/mobile-core';
import { FinanceBottomBar } from '../finance/FinanceBottomBar';

export type DriverEarningsScreenProps = Readonly<{
  lifetimeDeliveredVnd: number;
  availableBalanceVnd: number;
  deliveredOrderCount: number;
  totalOrderCount: number;
  todayEarningsVnd: number;
  todayJobCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate?: (route: string) => void;
}>;

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function DriverEarningsScreen({
  availableBalanceVnd,
  deliveredOrderCount,
  isError,
  isLoading,
  lifetimeDeliveredVnd,
  onNavigate,
  onRetry,
  todayEarningsVnd,
  todayJobCount,
  totalOrderCount,
}: DriverEarningsScreenProps) {
  const router = useRouter();
  const completionRate =
    totalOrderCount > 0 ? Math.round((deliveredOrderCount / totalOrderCount) * 100) : 0;

  const handleNavigate = useCallback(
    (route: string) => (onNavigate ? onNavigate(route) : router.push(route as never)),
    [onNavigate, router],
  );

  return (
    <ScreenScaffold
      headerRight={
        <Pressable
          accessibilityLabel="Trợ giúp"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => handleNavigate('/chat')}
          style={styles.headerActionBtn}
        >
          <IconSupport247 color={driverPrimitives.colors.gray700} size={20} />
        </Pressable>
      }
      headerTone="plain"
      onBack={() => (router.canGoBack() ? router.back() : handleNavigate('/orders'))}
      stickyFooter={
        <FinanceBottomBar activeTab="earnings" onNavigate={handleNavigate} />
      }
      title="Thu nhập"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {isLoading ? (
          <View style={styles.sectionGap}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : isError ? (
          <View style={styles.boundaryBox}>
            <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
          </View>
        ) : (
          <>
            {/* ── 1. Today Hero Bento Card ── */}
            <View style={styles.heroCard} testID="kpi-period-today">
              <View style={styles.heroHeaderRow}>
                <View style={styles.heroTitleGroup}>
                  <View style={styles.heroIconBox}>
                    <IconEarnings color={driverPrimitives.colors.gray700} size={18} />
                  </View>
                  <Text style={styles.heroTitle}>Thu nhập hôm nay</Text>
                </View>
                <View style={styles.jobsBadge}>
                  <Text style={styles.jobsBadgeText}>{todayJobCount} Jobs</Text>
                </View>
              </View>

              <Text style={styles.heroAmount}>
                {todayEarningsVnd === 0 ? '0 ₫' : formatCurrency(todayEarningsVnd)}
              </Text>

              <View style={styles.heroFooterRow}>
                <Text style={styles.heroScopeNote}>Tính từ danh sách đã tải</Text>
                <Pressable
                  accessibilityLabel="Xem chi tiết Thu nhập hôm nay"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => handleNavigate('/history')}
                >
                  <Text style={styles.detailLinkText}>Xem chi tiết →</Text>
                </Pressable>
              </View>
            </View>

            {/* ── 2. Operational KPIs (Apple Inset Grouped) ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Hiệu suất giao hàng</Text>

              <View style={styles.groupedCard} testID="kpi-completed-trips">
                {/* Row 1: Cuốc xe đã hoàn tất */}
                <Pressable
                  accessibilityLabel="Xem chi tiết cuốc xe đã hoàn tất"
                  accessibilityRole="button"
                  onPress={() => handleNavigate('/history')}
                  style={({ pressed }) => [styles.itemRow, pressed ? styles.itemPressed : null]}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconBox}>
                      <IconSpeedTruck color={driverPrimitives.colors.gray500} size={20} />
                    </View>
                    <Text style={styles.itemTitle}>Cuốc xe đã hoàn tất</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemValue}>{deliveredOrderCount} cuốc xe</Text>
                    <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
                  </View>
                </Pressable>

                <View style={styles.itemDivider} />

                {/* Row 2: Tỷ lệ giao thành công */}
                <View style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconBox}>
                      <IconCheck color={driverPrimitives.colors.gray500} size={20} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.itemTitle}>Tỷ lệ giao thành công</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemValue}>{completionRate}%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 3. Lifetime & Available Financials (Apple Inset Grouped) ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Thống kê tài chính</Text>

              <View style={styles.groupedCard} testID="kpi-net-payout">
                {/* Row 1: Tổng thu nhập trọn đời */}
                <Pressable
                  accessibilityLabel="Xem chi tiết tổng thu nhập trọn đời"
                  accessibilityRole="button"
                  onPress={() => handleNavigate('/history')}
                  style={({ pressed }) => [styles.itemRow, pressed ? styles.itemPressed : null]}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconBox}>
                      <IconEarnings color={driverPrimitives.colors.gray500} size={20} />
                    </View>
                    <Text style={styles.itemTitle}>Tổng thu nhập (trọn đời)</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemValue}>{formatCurrency(lifetimeDeliveredVnd)}</Text>
                    <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
                  </View>
                </Pressable>

                <View style={styles.itemDivider} />

                {/* Row 2: Số dư khả dụng để rút */}
                <Pressable
                  accessibilityLabel="Xem ví và rút tiền"
                  accessibilityRole="button"
                  onPress={() => handleNavigate('/wallet')}
                  style={({ pressed }) => [styles.itemRow, pressed ? styles.itemPressed : null]}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconBox}>
                      <IconWallet color={driverPrimitives.colors.gray500} size={20} />
                    </View>
                    <View style={styles.itemTitleCol}>
                      <Text style={styles.itemTitle}>Số dư khả dụng để rút</Text>
                      <Text style={styles.itemSub}>Tự động cập nhật</Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemValue}>{formatCurrency(availableBalanceVnd)}</Text>
                    <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
                  </View>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  headerActionBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 48,
  },
  sectionGap: {
    gap: 12,
  },
  boundaryBox: {
    paddingVertical: 12,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  heroHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroIconBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  heroTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  jobsBadge: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  jobsBadgeText: {
    color: colors.neutral.mutedText,
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroAmount: {
    color: driverPrimitives.colors.gray900,
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  heroFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  heroScopeNote: {
    color: driverPrimitives.colors.gray400,
    fontSize: 12,
  },
  detailLinkText: {
    color: driverPrimitives.colors.blue500,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Sections */
  sectionBlock: {
    gap: 8,
  },
  sectionHeading: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  groupedCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemPressed: {
    backgroundColor: driverPrimitives.colors.gray50,
  },
  itemLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  itemIconBox: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  itemTitleCol: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  itemSub: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11.5,
  },
  itemRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  itemValue: {
    color: driverPrimitives.colors.gray900,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 52,
  },
});
