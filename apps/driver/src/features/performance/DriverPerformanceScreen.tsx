import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  leopardPalette,
  radius,
  spacing,
  IconCheck,
  IconChevron,
  IconClock,
  IconSecurityShield,
  IconSpeedTruck,
  IconStar,
  IconTrophy,
  ScreenScaffold,
  StarRating,
} from '@leopard/mobile-core';

type ReviewFeedItem = {
  id: string;
  rating: number;
  tags: string[];
  comment: string;
  createdAtLabel: string;
};

const mockReviews: ReviewFeedItem[] = [
  {
    id: 'r-1',
    rating: 5,
    tags: ['Đúng giờ', 'Cẩn thận'],
    comment: 'Tài xế giao hàng rất nhanh và hỗ trợ bưng kiện hàng lên lầu.',
    createdAtLabel: 'Hôm nay, 14:40',
  },
  {
    id: 'r-2',
    rating: 5,
    tags: ['Thân thiện', 'Xe sạch sẽ'],
    comment: 'Bảo quản thùng hoa quả rất tốt, không bị dập.',
    createdAtLabel: 'Hôm qua, 11:30',
  },
  {
    id: 'r-3',
    rating: 5,
    tags: ['Đúng giờ', 'Chuyên nghiệp'],
    comment: 'Giao đúng giờ hẹn, chữ ký thủ kho POD đầy đủ.',
    createdAtLabel: '18/08/2026',
  },
];

const TIERS = [
  { id: 'standard', label: 'Chuẩn', active: false },
  { id: 'silver', label: 'Bạc', active: false },
  { id: 'gold', label: 'Vàng', active: true },
  { id: 'diamond', label: 'Kim Cương', active: false },
] as const;

export function DriverPerformanceScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold
      eyebrow="DRIVER · OPERATIONAL METRICS"
      headerLeading={
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconChevron color={colors.brand.background} direction="left" size={20} />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </Pressable>
      }
      headerTone="plain"
      title="Điểm hiệu suất"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. Executive Rating & Tier Card (Double-Bezel) */}
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.overviewTopRow}>
              <View style={styles.ratingBox}>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingNumber}>4.98</Text>
                  <IconStar color="#F59E0B" fill="#F59E0B" size={22} />
                </View>
                <Text style={styles.ratingCount}>128 đánh giá</Text>
              </View>

              <View style={styles.tierBox}>
                <View style={styles.tierBadge}>
                  <IconTrophy color="#B45309" size={14} />
                  <Text style={styles.tierBadgeText}>HẠNG VÀNG</Text>
                </View>
                <Text style={styles.tierDesc}>Ưu tiên phân phối các chuyến hàng cước cao.</Text>
                <Text style={styles.tierProgressLabel}>Còn 22 chuyến để lên hạng Kim Cương</Text>
              </View>
            </View>

            {/* Tier Steps Progression (Chuẩn ➔ Bạc ➔ Vàng ➔ Kim Cương) */}
            <View style={styles.tierProgressContainer}>
              <Text style={styles.tierProgressionLabel}>CẤP BẬC ĐỐI TÁC</Text>
              <View style={styles.tierStepsRow}>
                {TIERS.map((t, idx) => (
                  <View key={t.id} style={styles.tierStepCol}>
                    <View
                      style={[
                        styles.tierStepCircle,
                        t.active ? styles.tierStepCircleActive : idx < 2 ? styles.tierStepCircleDone : null,
                      ]}
                    >
                      {idx < 2 ? (
                        <IconCheck color="#FFFFFF" size={12} strokeWidth={2.5} />
                      ) : t.active ? (
                        <IconTrophy color="#FFFFFF" size={12} />
                      ) : (
                        <Text style={styles.tierStepDotNumber}>{idx + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.tierStepText,
                        t.active ? styles.tierStepTextActive : null,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 2. Operational KPIs Section (Double-Bezel) */}
        <Text style={styles.sectionLabel}>Chỉ số vận hành cốt lõi</Text>
        <View style={styles.doubleBezelOuterMuted}>
          <View style={styles.doubleBezelInnerMuted}>
            {/* OTD KPI */}
            <View style={styles.metricRow}>
              <View style={styles.metricIconWrap}>
                <IconClock color="#0EA5E9" size={18} />
              </View>
              <View style={styles.metricLeft}>
                <Text style={styles.metricTitle}>Tỷ lệ đúng giờ (OTD)</Text>
                <Text style={styles.metricSub}>Chuẩn hệ thống: &gt; 90%</Text>
              </View>
              <Text style={[styles.metricValue, styles.metricValueEmerald]}>99.4%</Text>
            </View>

            <View style={styles.rowDivider} />

            {/* Acceptance Rate KPI */}
            <View style={styles.metricRow}>
              <View style={styles.metricIconWrap}>
                <IconSpeedTruck color="#10B981" size={18} />
              </View>
              <View style={styles.metricLeft}>
                <Text style={styles.metricTitle}>Tỷ lệ nhận cuốc</Text>
                <Text style={styles.metricSub}>Chuẩn hệ thống: &gt; 95%</Text>
              </View>
              <Text style={[styles.metricValue, styles.metricValueEmerald]}>96.5%</Text>
            </View>

            <View style={styles.rowDivider} />

            {/* Cancellation Rate KPI */}
            <View style={styles.metricRow}>
              <View style={styles.metricIconWrap}>
                <IconSecurityShield color="#10B981" size={18} />
              </View>
              <View style={styles.metricLeft}>
                <Text style={styles.metricTitle}>Tỷ lệ hủy cuốc</Text>
                <Text style={styles.metricSub}>Chuẩn hệ thống: &lt; 1%</Text>
              </View>
              <Text style={[styles.metricValue, styles.metricValueEmerald]}>0.8%</Text>
            </View>

            <View style={styles.rowDivider} />

            {/* POD Compliance KPI */}
            <View style={[styles.metricRow, styles.metricRowLast]}>
              <View style={styles.metricIconWrap}>
                <IconCheck color="#059669" size={18} strokeWidth={2.5} />
              </View>
              <View style={styles.metricLeft}>
                <Text style={styles.metricTitle}>Tỷ lệ nộp e-POD hợp lệ</Text>
                <Text style={styles.metricSub}>Chuẩn hệ thống: 100%</Text>
              </View>
              <Text style={[styles.metricValue, styles.metricValueEmerald]}>100%</Text>
            </View>
          </View>
        </View>

        {/* 3. Customer Reviews Feed */}
        <Text style={styles.sectionLabel}>Đánh giá từ khách hàng ({mockReviews.length})</Text>
        <View style={styles.reviewList}>
          {mockReviews.map((item) => (
            <View key={item.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <StarRating rating={item.rating} size={14} />
                <Text style={styles.reviewTime}>{item.createdAtLabel}</Text>
              </View>
              <View style={styles.tagRow}>
                {item.tags.map((t) => (
                  <View key={t} style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{t}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.reviewComment}>{item.comment}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl + 20,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    minWidth: 44,
    paddingVertical: spacing.xxs,
  },
  backButtonText: {
    color: colors.brand.background,
    fontSize: 13.5,
    fontWeight: '700',
  },
  /* Double-Bezel Card (Dark/Navy outer) */
  doubleBezelOuter: {
    backgroundColor: '#0B1E42',
    borderRadius: radius.bezelOuter,
    elevation: 3,
    padding: 3,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  doubleBezelInner: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  overviewTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ratingBox: {
    alignItems: 'center',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderRightWidth: 1,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  ratingNumber: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  ratingCount: {
    color: colors.operational.inkMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  tierBox: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  tierBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  tierDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  tierProgressLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  /* Tier Steps Progression Bar */
  tierProgressContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tierProgressionLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierStepCol: {
    alignItems: 'center',
    gap: 4,
  },
  tierStepCircle: {
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  tierStepCircleDone: {
    backgroundColor: '#10B981',
  },
  tierStepCircleActive: {
    backgroundColor: '#F59E0B',
  },
  tierStepDotNumber: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  tierStepText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  tierStepTextActive: {
    color: '#F59E0B',
    fontWeight: '800',
  },

  /* Double-Bezel Card (Muted / White) */
  doubleBezelOuterMuted: {
    backgroundColor: '#0B1E42',
    borderRadius: radius.bezelOuter,
    elevation: 2,
    padding: 2,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  doubleBezelInnerMuted: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },

  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  metricRowLast: {
    paddingBottom: 12,
  },
  rowDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
  },
  metricIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  metricLeft: {
    flex: 1,
    gap: 2,
  },
  metricTitle: {
    color: colors.neutral.titleText,
    fontSize: 13.5,
    fontWeight: '600',
  },
  metricSub: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricValueEmerald: {
    color: '#10B981',
  },

  /* Customer Reviews */
  reviewList: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  reviewCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    padding: spacing.md,
  },
  reviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewTime: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagBadge: {
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagBadgeText: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '700',
  },
  reviewComment: {
    color: colors.neutral.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
