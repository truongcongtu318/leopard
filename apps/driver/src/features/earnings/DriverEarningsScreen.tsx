// apps/driver/src/features/earnings/DriverEarningsScreen.tsx
import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Box,
  Card,
  Divider,
  HStack,
  IconCheck,
  IconChevronRight,
  IconEarnings,
  IconSpeedTruck,
  IconSupport247,
  IconWallet,
  ScreenScaffold,
  ScreenState,
  SkeletonCard,
  VStack,
  colors,
  driverPrimitives,
  haptic,
  iosContinuousCurve,
  typeScale,
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
    (route: string) => {
      haptic.selection();
      if (onNavigate) {
        onNavigate(route);
      } else {
        router.push(route as never);
      }
    },
    [onNavigate, router],
  );

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => (router.canGoBack() ? router.back() : handleNavigate('/orders'))}
      stickyFooterBleed
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
          <VStack space="sm" style={styles.sectionGap}>
            <SkeletonCard />
            <SkeletonCard />
          </VStack>
        ) : isError ? (
          <Box style={styles.boundaryBox}>
            <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
          </Box>
        ) : (
          <>
            {/* ── 1. Today Hero Bento Card ── */}
            <Card style={styles.heroCard} testID="kpi-period-today">
              <HStack style={styles.heroHeaderRow}>
                <HStack style={styles.heroTitleGroup}>
                  <Box style={styles.heroIconBox}>
                    <IconEarnings color="#FFFFFF" size={20} />
                  </Box>
                  <Text style={styles.heroTitle}>Thu nhập hôm nay</Text>
                </HStack>
                <Badge action="warning" size="sm" style={styles.jobsBadge}>
                  <Badge.Text style={styles.jobsBadgeText}>{todayJobCount} Jobs</Badge.Text>
                </Badge>
              </HStack>

              <Text style={styles.heroAmount}>
                {todayEarningsVnd === 0 ? '0 ₫' : formatCurrency(todayEarningsVnd)}
              </Text>

              <HStack style={styles.heroFooterRow}>
                <Text style={styles.heroScopeNote}>Tính từ danh sách đã tải</Text>
                <Pressable
                  accessibilityLabel="Xem chi tiết Thu nhập hôm nay"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    haptic.light();
                    handleNavigate('/history');
                  }}
                  style={({ pressed }) => [
                    styles.detailLinkBtn,
                    pressed ? styles.detailLinkBtnPressed : null,
                  ]}
                >
                  <Text style={styles.detailLinkText}>Xem chi tiết →</Text>
                </Pressable>
              </HStack>
            </Card>

            {/* ── 2. Operational KPIs (Apple Inset Grouped) ── */}
            <VStack style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Hiệu suất giao hàng</Text>

              <Card style={styles.groupedCard} testID="kpi-completed-trips">
                {/* Row 1: Cuốc xe đã hoàn tất */}
                <Pressable
                  accessibilityLabel="Xem chi tiết cuốc xe đã hoàn tất"
                  accessibilityRole="button"
                  onPress={() => handleNavigate('/history')}
                  style={({ pressed }) => [styles.itemRow, pressed ? styles.itemPressed : null]}
                >
                  <HStack style={styles.itemLeft}>
                    <Box style={styles.itemIconBox}>
                      <IconSpeedTruck color={driverPrimitives.colors.gray700} size={20} />
                    </Box>
                    <Text style={styles.itemTitle}>Cuốc xe đã hoàn tất</Text>
                  </HStack>
                  <HStack style={styles.itemRight}>
                    <Text style={styles.itemValue}>{deliveredOrderCount} cuốc xe</Text>
                    <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
                  </HStack>
                </Pressable>

                <Divider style={styles.itemDivider} />

                {/* Row 2: Tỷ lệ giao thành công */}
                <HStack style={styles.itemRow}>
                  <HStack style={styles.itemLeft}>
                    <Box style={styles.itemIconBox}>
                      <IconCheck color={driverPrimitives.colors.green700} size={20} strokeWidth={2.5} />
                    </Box>
                    <Text style={styles.itemTitle}>Tỷ lệ giao thành công</Text>
                  </HStack>
                  <Box style={styles.itemRight}>
                    <Text style={styles.itemValueSuccess}>{completionRate}%</Text>
                  </Box>
                </HStack>
              </Card>
            </VStack>

            {/* ── 3. Lifetime & Available Financials (Apple Inset Grouped) ── */}
            <VStack style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Thống kê tài chính</Text>

              <Card style={styles.groupedCard} testID="kpi-net-payout">
                {/* Row 1: Tổng thu nhập trọn đời */}
                <Pressable
                  accessibilityLabel="Xem chi tiết tổng thu nhập trọn đời"
                  accessibilityRole="button"
                  onPress={() => handleNavigate('/history')}
                  style={({ pressed }) => [styles.itemRow, pressed ? styles.itemPressed : null]}
                >
                  <HStack style={styles.itemLeft}>
                    <Box style={styles.itemIconBox}>
                      <IconEarnings color={driverPrimitives.colors.orange500} size={20} />
                    </Box>
                    <Text style={styles.itemTitle}>Tổng thu nhập (trọn đời)</Text>
                  </HStack>
                  <HStack style={styles.itemRight}>
                    <Text style={styles.itemValue}>{formatCurrency(lifetimeDeliveredVnd)}</Text>
                    <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
                  </HStack>
                </Pressable>

                <Divider style={styles.itemDivider} />

                {/* Row 2: Số dư khả dụng để rút */}
                <Pressable
                  accessibilityLabel="Xem ví và rút tiền"
                  accessibilityRole="button"
                  onPress={() => handleNavigate('/wallet')}
                  style={({ pressed }) => [styles.itemRow, pressed ? styles.itemPressed : null]}
                >
                  <HStack style={styles.itemLeft}>
                    <Box style={styles.itemIconBox}>
                      <IconWallet color={driverPrimitives.colors.gray700} size={20} />
                    </Box>
                    <VStack style={styles.itemTitleCol}>
                      <Text style={styles.itemTitle}>Số dư khả dụng để rút</Text>
                      <Text style={styles.itemSub}>Tự động cập nhật</Text>
                    </VStack>
                  </HStack>
                  <HStack style={styles.itemRight}>
                    <Text style={styles.itemValueHighlight}>{formatCurrency(availableBalanceVnd)}</Text>
                    <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
                  </HStack>
                </Pressable>
              </Card>
            </VStack>
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

  /* Hero Bento Card - High Contrast Midnight Navy (#0B2545) */
  heroCard: {
    backgroundColor: driverPrimitives.colors.dark950,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 22,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowColor: driverPrimitives.colors.dark950,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  heroHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  heroIconBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  heroTitle: {
    color: '#FFFFFF',
    ...typeScale.subheadline,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  jobsBadge: {
    backgroundColor: driverPrimitives.colors.amber500,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  jobsBadgeText: {
    color: '#FFFFFF',
    ...typeScale.caption2,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroAmount: {
    color: '#FFFFFF',
    ...typeScale.largeTitle,
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  heroFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  heroScopeNote: {
    color: 'rgba(255, 255, 255, 0.75)',
    ...typeScale.caption1,
    fontWeight: '500',
  },
  detailLinkBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  detailLinkBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  detailLinkText: {
    color: '#93C5FD',
    ...typeScale.footnote,
    fontWeight: '700',
  },

  /* Sections */
  sectionBlock: {
    gap: 8,
  },
  sectionHeading: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
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
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemPressed: {
    backgroundColor: driverPrimitives.colors.gray50,
    opacity: 0.95,
  },
  itemLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    flex: 1,
  },
  itemIconBox: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  itemTitleCol: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  itemSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  itemRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  itemValue: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemValueSuccess: {
    color: driverPrimitives.colors.green700,
    ...typeScale.subheadline,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  itemValueHighlight: {
    color: driverPrimitives.colors.orange600,
    ...typeScale.subheadline,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  itemDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 66,
  },
});
