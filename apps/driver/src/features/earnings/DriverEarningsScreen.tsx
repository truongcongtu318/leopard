// apps/driver/src/features/earnings/DriverEarningsScreen.tsx
import React, { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  AppText,
  driverPrimitives,
  driverSemantics,
  iosContinuousCurve,
  layout,
  radius,
  spacing,
  IconChevronRight,
  NavigableMetricCard,
  ScreenState,
  SkeletonCard,
} from '@leopard/mobile-core';
import { FinanceBottomBar } from '../finance/FinanceBottomBar';

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

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

function BackArrowIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
        fill={color}
      />
    </Svg>
  );
}

function HelpCircleIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"
        fill={color}
      />
    </Svg>
  );
}

function SparkleIcon({ size = 20, color = driverPrimitives.colors.blue500 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M9 21.5l1.5-4.5L15 15.5l-4.5-1.5L9 9.5l-1.5 4.5L3 15.5l4.5 1.5L9 21.5zm10-7l.9-2.6L22.5 11l-2.6-.9L19 7.5l-.9 2.6L15.5 11l2.6.9.9 2.6zm-2-10l.6-1.9L19.5 2l-1.9-.6L17 0l-.6 1.9L14.5 2l1.9.6.6 1.9z"
        fill={color}
      />
    </Svg>
  );
}

export function DriverEarningsScreen({
  availableBalanceVnd,
  deliveredOrderCount,
  isError,
  isLoading,
  lifetimeDeliveredVnd,
  onNavigate,
  onRetry,
  totalOrderCount,
}: DriverEarningsScreenProps) {
  const router = useRouter();
  const completionRate = totalOrderCount > 0 ? Math.round((deliveredOrderCount / totalOrderCount) * 100) : 0;

  const handleNavigate = useCallback(
    (route: string) => (onNavigate ? onNavigate(route) : router.push(route as never)),
    [onNavigate, router],
  );

  const periodCards = [
    { key: 'today', title: 'Thu nhập hôm nay', jobs: 0, amount: 0 },
    { key: 'week', title: 'Thu nhập tuần này', jobs: 0, amount: 0 },
    { key: 'month', title: 'Thu nhập tháng này', jobs: 0, amount: 0 },
  ];

  return (
    <View style={styles.screenRoot}>
      {/* ── Top Header (Image 4) ── */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : handleNavigate('/orders'))}
          style={styles.headerActionBtn}
        >
          <BackArrowIcon />
        </Pressable>

        <Text accessibilityRole="header" style={styles.headerTitle}>
          Thu nhập
        </Text>

        <View style={styles.headerRightActions}>
          <Pressable accessibilityLabel="Trợ giúp" accessibilityRole="button" hitSlop={12} style={styles.headerActionBtn}>
            <HelpCircleIcon />
          </Pressable>
          <Pressable accessibilityLabel="Tính năng mới" accessibilityRole="button" hitSlop={12} style={styles.headerActionBtn}>
            <SparkleIcon />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
            {/* ── Period Cards: Horizontal Carousel (Image 4) ── */}
            <ScrollView
              contentContainerStyle={styles.periodRow}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.periodScroll}
            >
              {periodCards.map((card) => (
                <View key={card.key} style={styles.periodCard} testID={`kpi-period-${card.key}`}>
                  <View style={styles.periodHeaderRow}>
                    <Text style={styles.periodTitle}>{card.title}</Text>
                    <View style={styles.jobsBadge}>
                      <Text style={styles.jobsBadgeText}>{card.jobs} Jobs</Text>
                    </View>
                  </View>

                  <Text style={styles.periodAmount}>
                    {card.amount === 0 ? '0 ₫' : formatCurrency(card.amount)}
                  </Text>

                  <Pressable
                    accessibilityLabel={`Xem chi tiết ${card.title}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => handleNavigate('/history')}
                  >
                    <Text style={styles.detailLinkText}>Xem chi tiết</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            {/* ── Real Totals Metric Cards (Image 4) ── */}
            <View style={styles.metricCardStack} testID="kpi-completed-trips">
              <NavigableMetricCard
                onPress={() => handleNavigate('/history')}
                title="Cuốc xe đã hoàn tất"
                value={`${deliveredOrderCount} cuốc xe`}
              />
              <NavigableMetricCard
                hasChevron={false}
                title="Tỷ lệ giao thành công"
                value={`${completionRate}%`}
              />
            </View>

            <View style={styles.metricCardStack} testID="kpi-net-payout">
              <NavigableMetricCard
                onPress={() => handleNavigate('/history')}
                title="Tổng thu nhập (trọn đời)"
                value={formatCurrency(lifetimeDeliveredVnd)}
              />
              <NavigableMetricCard
                onPress={() => handleNavigate('/wallet')}
                subtitle="Tự động cập nhật"
                title="Số dư khả dụng để rút"
                value={formatCurrency(availableBalanceVnd)}
                valueTone="success"
              />
            </View>
          </>
        )}
      </ScrollView>

      <FinanceBottomBar activeTab="earnings" onNavigate={handleNavigate} />
    </View>
  );
}

const PERIOD_CARD_WIDTH = 290;

const styles = StyleSheet.create({
  screenRoot: {
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
  },
  headerBar: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderBottomColor: driverPrimitives.colors.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerActionBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 18,
    fontWeight: '700',
  },
  headerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  content: {
    gap: 16,
    paddingBottom: 88,
    paddingTop: 16,
  },
  sectionGap: {
    gap: 12,
    paddingHorizontal: 16,
  },
  boundaryBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  periodScroll: {
    flexGrow: 0,
  },
  periodRow: {
    gap: 12,
    paddingHorizontal: 16,
  },
  periodCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: driverPrimitives.radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    width: PERIOD_CARD_WIDTH,
    ...driverPrimitives.shadows.sm,
  },
  periodHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 15,
    fontWeight: '600',
  },
  jobsBadge: {
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  jobsBadgeText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '600',
  },
  periodAmount: {
    color: driverPrimitives.colors.gray900,
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  detailLinkText: {
    color: driverPrimitives.colors.blue500,
    fontSize: 13,
    fontWeight: '600',
  },

  metricCardStack: {
    gap: 10,
    marginHorizontal: 16,
  },

  tooltipContainer: {
    alignItems: 'center',
    bottom: 74,
    position: 'absolute',
    right: '32%',
    zIndex: 60,
  },
  tooltipBubble: {
    backgroundColor: driverPrimitives.colors.blue500,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...driverPrimitives.shadows.md,
  },
  tooltipText: {
    color: driverPrimitives.colors.white,
    fontSize: 12.5,
    fontWeight: '600',
  },
  tooltipArrow: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 6,
    borderRightColor: 'transparent',
    borderRightWidth: 6,
    borderTopColor: driverPrimitives.colors.blue500,
    borderTopWidth: 6,
    height: 0,
    width: 0,
  },
});
