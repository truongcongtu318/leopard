import React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Box,
  Card,
  Divider,
  HStack,
  IconSecurityShield,
  IconSpeedTruck,
  IconStar,
  IconUser,
  ScreenScaffold,
  ScreenState,
  StarRating,
  VStack,
  colors,
  customerPalette,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
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
            {/* ── 1. Executive Rating Bento Card (Midnight Navy Brand Hero) ── */}
            <Card style={styles.ratingHeroCard}>
              <HStack style={styles.ratingScoreRow}>
                <Text style={styles.ratingBigNumber}>{ratingAvg.toFixed(2)}</Text>
                <IconStar color={leopardPalette.accentYellow} filled size={28} />
              </HStack>

              <Box style={styles.starsWrapper}>
                <StarRating
                  color={leopardPalette.accentYellow}
                  emptyColor="rgba(255, 255, 255, 0.25)"
                  rating={ratingAvg}
                  size={18}
                />
              </Box>

              <Text style={styles.ratingCountText}>{ratingCount} đánh giá</Text>
            </Card>

            {/* ── 2. Operational Core KPIs Section (Apple Inset Grouped) ── */}
            <VStack style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Chỉ số vận hành cốt lõi</Text>

              <Card style={styles.kpiCard}>
                {/* Acceptance Rate Row */}
                <HStack style={styles.metricRow}>
                  <Box style={styles.metricIconWrap}>
                    <IconSpeedTruck color={driverPrimitives.colors.gray500} size={20} />
                  </Box>
                  <VStack style={styles.metricInfoCol}>
                    <Text style={styles.metricTitle}>Tỷ lệ nhận cuốc</Text>
                    <Text style={styles.metricSub}>Tỷ lệ chấp nhận chuyến điều phối</Text>
                  </VStack>
                  <Text style={styles.metricValueText}>
                    {acceptancePct !== null && acceptancePct !== undefined
                      ? formatPct(acceptancePct)
                      : '—'}
                  </Text>
                </HStack>

                <Divider style={styles.metricDivider} />

                {/* Cancellation Rate Row */}
                <HStack style={styles.metricRow}>
                  <Box style={styles.metricIconWrap}>
                    <IconSecurityShield color={driverPrimitives.colors.gray500} size={20} />
                  </Box>
                  <VStack style={styles.metricInfoCol}>
                    <Text style={styles.metricTitle}>Tỷ lệ hủy cuốc</Text>
                    <Text style={styles.metricSub}>Chủ động huỷ chuyến sau khi nhận</Text>
                  </VStack>
                  <Text style={styles.metricValueText}>
                    {cancellationPct !== null && cancellationPct !== undefined
                      ? formatPct(cancellationPct)
                      : '—'}
                  </Text>
                </HStack>
              </Card>
            </VStack>

            {/* ── 3. Customer Reviews Feed (Apple Inset Grouped with Avatars) ── */}
            <VStack style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>
                Đánh giá từ khách hàng ({recentReviews.length})
              </Text>

              {recentReviews.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Chưa có đánh giá nào từ khách hàng</Text>
                </Card>
              ) : (
                <Card style={styles.reviewsGroupCard}>
                  {recentReviews.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <HStack style={styles.reviewItemRow}>
                        {/* Left: Avatar */}
                        <Box style={styles.reviewAvatarSquircle}>
                          <IconUser color={driverPrimitives.colors.gray500} size={18} />
                        </Box>

                        {/* Right: Stars + Date + Comment */}
                        <VStack style={styles.reviewContentCol}>
                          <HStack style={styles.reviewHeaderRow}>
                            <StarRating rating={item.rating} size={13} />
                            <Text style={styles.reviewDateText}>
                              {formatReviewDate(item.createdAt)}
                            </Text>
                          </HStack>

                          {item.comment ? (
                            <Text style={styles.reviewCommentText}>{item.comment}</Text>
                          ) : null}
                        </VStack>
                      </HStack>

                      {index < recentReviews.length - 1 ? (
                        <Divider style={styles.reviewSeparator} />
                      ) : null}
                    </React.Fragment>
                  ))}
                </Card>
              )}
            </VStack>
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

  /* 1. Rating Hero Card - Midnight Navy Brand Hero */
  ratingHeroCard: {
    alignItems: 'center',
    backgroundColor: leopardPalette.darkHeroBg,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 6,
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 24,
    shadowColor: leopardPalette.darkHeroBg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  ratingScoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ratingBigNumber: {
    color: customerPalette.surfaceWhite,
    fontSize: 38,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  starsWrapper: {
    alignItems: 'center',
    paddingVertical: spacing.hairline,
  },
  ratingCountText: {
    color: leopardPalette.inputPlaceholder,
    ...typeScale.footnote,
    fontVariant: ['tabular-nums'],
  },

  /* 2. Core KPIs Section - Apple Inset Grouped */
  sectionBlock: {
    gap: spacing.xs,
  },
  sectionLabel: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: spacing.xxs,
  },
  kpiCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  metricIconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  metricInfoCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  metricTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metricSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  metricValueText: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.title3,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metricDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 54,
  },

  /* 3. Reviews Feed - Apple Grouped with Avatars */
  reviewsGroupCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  reviewItemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  reviewAvatarSquircle: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    marginTop: 2,
    width: 36,
  },
  reviewContentCol: {
    flex: 1,
    gap: 6,
  },
  reviewHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 20,
  },
  reviewDateText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    fontVariant: ['tabular-nums'],
  },
  reviewCommentText: {
    color: colors.neutral.titleText,
    ...typeScale.footnote,
    lineHeight: 20,
  },
  reviewSeparator: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 60,
    marginRight: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
  },
});
