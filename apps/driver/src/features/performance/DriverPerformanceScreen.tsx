import React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  IconSecurityShield,
  IconSpeedTruck,
  IconStar,
  ScreenScaffold,
  ScreenState,
  StarRating,
  colors,
  driverPrimitives,
  iosContinuousCurve,
} from '@leopard/mobile-core';
import type { DriverPerformanceReviewResponse } from './adapter';

function formatReviewDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export type DriverPerformanceScreenProps = Readonly<{
  ratingAvg: number;
  ratingCount: number;
  acceptancePct: number | null;
  cancellationPct: number | null;
  recentReviews: readonly DriverPerformanceReviewResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}>;

export function DriverPerformanceScreen({
  acceptancePct,
  cancellationPct,
  isError,
  isLoading,
  onRetry,
  ratingAvg,
  ratingCount,
  recentReviews,
}: DriverPerformanceScreenProps) {
  const router = useRouter();

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => router.back()}
      title="Điểm hiệu suất"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {isLoading ? (
          <ScreenState state="loading" />
        ) : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            {/* ── 1. Executive Rating Bento Card (Apple White Minimalist) ── */}
            <View style={styles.ratingHeroCard}>
              <View style={styles.ratingScoreRow}>
                <Text style={styles.ratingBigNumber}>{ratingAvg.toFixed(2)}</Text>
                <IconStar color={driverPrimitives.colors.amber500} filled size={28} />
              </View>

              <View style={styles.starsWrapper}>
                <StarRating rating={ratingAvg} size={16} />
              </View>

              <Text style={styles.ratingCountText}>{ratingCount} đánh giá</Text>

              <View style={styles.ratingBadgePill}>
                <View style={styles.ratingBadgeDot} />
                <Text style={styles.ratingBadgeText}>
                  {ratingAvg >= 4.8
                    ? 'Chất lượng xuất sắc'
                    : ratingAvg >= 4.0
                    ? 'Đạt chuẩn vận tải'
                    : 'Cần cải thiện chất lượng'}
                </Text>
              </View>
            </View>

            {/* ── 2. Operational Core KPIs Section (Apple Inset Grouped) ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Chỉ số vận hành cốt lõi</Text>

              <View style={styles.kpiCard}>
                {/* Acceptance Rate Row */}
                <View style={styles.metricRow}>
                  <View style={styles.metricIconWrap}>
                    <IconSpeedTruck color={driverPrimitives.colors.gray500} size={20} />
                  </View>
                  <View style={styles.metricInfoCol}>
                    <Text style={styles.metricTitle}>Tỷ lệ nhận cuốc</Text>
                    <Text style={styles.metricSub}>Tỷ lệ chấp nhận chuyến điều phối</Text>
                  </View>
                  <Text style={styles.metricValueText}>
                    {acceptancePct !== null && acceptancePct !== undefined
                      ? formatPct(acceptancePct)
                      : '—'}
                  </Text>
                </View>

                <View style={styles.metricDivider} />

                {/* Cancellation Rate Row */}
                <View style={styles.metricRow}>
                  <View style={styles.metricIconWrap}>
                    <IconSecurityShield color={driverPrimitives.colors.gray500} size={20} />
                  </View>
                  <View style={styles.metricInfoCol}>
                    <Text style={styles.metricTitle}>Tỷ lệ hủy cuốc</Text>
                    <Text style={styles.metricSub}>Chủ động huỷ chuyến sau khi nhận</Text>
                  </View>
                  <Text style={styles.metricValueText}>
                    {cancellationPct !== null && cancellationPct !== undefined
                      ? formatPct(cancellationPct)
                      : '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 3. Customer Reviews Feed (Apple Inset Grouped) ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>
                Đánh giá từ khách hàng ({recentReviews.length})
              </Text>

              {recentReviews.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Chưa có đánh giá nào từ khách hàng</Text>
                </View>
              ) : (
                <View style={styles.reviewsGroupCard}>
                  {recentReviews.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <View style={styles.reviewItemRow}>
                        <View style={styles.reviewItemHeader}>
                          <StarRating rating={item.rating} size={14} />
                          <Text style={styles.reviewDateText}>
                            {formatReviewDate(item.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.reviewCommentText}>{item.comment}</Text>
                      </View>
                      {index < recentReviews.length - 1 ? (
                        <View style={styles.reviewSeparator} />
                      ) : null}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 40,
  },

  /* 1. Rating Hero Card - Pure Apple White Minimal */
  ratingHeroCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 8,
    paddingVertical: 22,
    paddingHorizontal: 16,
    ...driverPrimitives.shadows.sm,
  },
  ratingScoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ratingBigNumber: {
    color: driverPrimitives.colors.gray900,
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  starsWrapper: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  ratingCountText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  ratingBadgePill: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingBadgeDot: {
    backgroundColor: driverPrimitives.colors.green500,
    borderRadius: 9999,
    height: 6,
    width: 6,
  },
  ratingBadgeText: {
    color: driverPrimitives.colors.gray700,
    fontSize: 11.5,
    fontWeight: '600',
  },

  /* 2. Core KPIs Section - Apple Inset Grouped */
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  kpiCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricIconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  metricInfoCol: {
    flex: 1,
    gap: 2,
  },
  metricTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metricSub: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11.5,
    fontWeight: '400',
  },
  metricValueText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  metricDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 54,
  },

  /* 3. Reviews Feed - Apple Grouped */
  reviewsGroupCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  reviewItemRow: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reviewItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewDateText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  reviewCommentText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  reviewSeparator: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginHorizontal: 16,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 13,
    fontWeight: '500',
  },
});
