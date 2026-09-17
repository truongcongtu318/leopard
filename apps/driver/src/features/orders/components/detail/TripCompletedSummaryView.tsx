import React, { memo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  IconCheck,
  driverHapticMatrix,
  driverJourneyTokens,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type TripCompletedSummaryViewProps = Readonly<{
  orderCode?: string;
  totalEarnings?: number;
  deliveryFare?: number;
  loadingFee?: number;
  codCollected?: number;
  durationMinutes?: number;
  distanceKm?: number;
  onGoHome: () => void;
}>;

function formatVnd(val: number): string {
  return `${Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
}

export const TripCompletedSummaryView = memo(function TripCompletedSummaryView({
  codCollected = 520000,
  deliveryFare = 210000,
  distanceKm = 8.6,
  durationMinutes = 42,
  loadingFee = 35000,
  onGoHome,
  orderCode = '#LP-8921',
  totalEarnings = 245000,
}: TripCompletedSummaryViewProps) {
  const [rating, setRating] = useState<number>(0);

  const handleSelectStar = (stars: number) => {
    setRating(stars);
    driverHapticMatrix.swipeThreshold();
  };

  const handleFinish = () => {
    driverHapticMatrix.actionHeavy();
    onGoHome();
  };

  return (
    <View style={styles.container} testID="trip-completed-summary-view">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon Badge */}
        <View style={styles.successIconWrapper}>
          <View style={styles.successIconCircle}>
            <IconCheck color="#FFFFFF" size={44} />
          </View>
        </View>

        <Text style={styles.title}>HOÀN THÀNH CHUYẾN ĐI!</Text>
        <View style={styles.orderBadgePill}>
          <Text style={styles.orderSubtitle}>Mã đơn: {orderCode}</Text>
        </View>

        {/* Bento Revenue Card */}
        <View style={styles.bentoCard}>
          <Text style={styles.earningsLabel}>TỔNG THU NHẬP CỦA BẠN</Text>
          <Text style={styles.earningsHero}>+{formatVnd(totalEarnings)}</Text>
          <Text style={styles.subtext}>Đã khấu trừ phí nền tảng 18%</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>• Cước phí vận chuyển</Text>
            <Text style={styles.rowValue}>{formatVnd(deliveryFare)}</Text>
          </View>

          {loadingFee > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.rowLabel}>• Phụ phí bốc xếp tầng 1</Text>
              <Text style={styles.rowValue}>+{formatVnd(loadingFee)}</Text>
            </View>
          ) : null}

          {codCollected > 0 ? (
            <View style={styles.detailRow}>
              <Text style={[styles.rowLabel, styles.codText]}>• Tiền mặt COD đã thu</Text>
              <Text style={[styles.rowValue, styles.codText]}>{formatVnd(codCollected)}</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>• Thời gian hoàn thành</Text>
            <Text style={styles.rowValue}>{durationMinutes} phút</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>• Quãng đường thực tế</Text>
            <Text style={styles.rowValue}>{distanceKm} km</Text>
          </View>
        </View>

        {/* Quick Rating 5-star */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingPrompt}>ĐÁNH GIÁ KHÁCH HÀNG (TÙY CHỌN)</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                accessibilityLabel={`Đánh giá ${star} sao`}
                accessibilityRole="button"
                onPress={() => handleSelectStar(star)}
                style={styles.starBtn}
                testID={`star-btn-${star}`}
              >
                <Text style={[styles.starIcon, star <= rating ? styles.starFilled : styles.starEmpty]}>
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer CTA Button (>= 56pt) */}
      <View style={styles.footerContainer}>
        <Pressable
          accessibilityLabel="Về trang chủ, sẵn sàng nhận đơn"
          accessibilityRole="button"
          onPress={handleFinish}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed ? styles.btnPressed : null,
          ]}
          testID="btn-go-home"
        >
          <Text style={styles.primaryCtaText}>
            Về trang chủ, sẵn sàng nhận đơn
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: 110,
    alignItems: 'center',
  },
  successIconWrapper: {
    marginBottom: spacing.sm,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    ...typeScale.title2,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  orderBadgePill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  orderSubtitle: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: '#D97706',
  },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    padding: spacing.md,
    marginBottom: spacing.md,
    ...iosContinuousCurve,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  earningsLabel: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: '#64748B',
  },
  earningsHero: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0B2545',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  subtext: {
    ...typeScale.caption2,
    color: '#94A3B8',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    ...typeScale.subheadline,
    color: '#475569',
  },
  rowValue: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  codText: {
    color: '#B45309',
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    padding: spacing.md,
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  ratingPrompt: {
    ...typeScale.caption1,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  starBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 32,
  },
  starFilled: {
    color: '#F59E0B',
  },
  starEmpty: {
    color: '#E2E8F0',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryCta: {
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    borderRadius: 16,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  primaryCtaText: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
