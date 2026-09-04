import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { IconTrophy, StarRating } from '../../../ui/icons/CoreIcons';

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
    rating: 4,
    tags: ['Đúng giờ'],
    comment: 'Giao đúng giờ hẹn.',
    createdAtLabel: '18/08/2026',
  },
];

export function DriverPerformanceScreen() {
  return (
    <ScreenScaffold
      eyebrow="DRIVER · QUALITY & RATING"
      headerTone="ink"
      subtitle="Chỉ số vận hành, tỷ lệ nhận đơn và phản hồi từ khách hàng."
      title="Điểm hiệu suất"
    >
      <View style={styles.container}>
        <View style={styles.overviewCard}>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingNumber}>4.8</Text>
            <StarRating rating={4.8} size={14} />
            <Text style={styles.ratingCount}>128 đánh giá</Text>
          </View>
          <View style={styles.tierBox}>
            <View style={styles.tierBadge}>
              <View style={styles.tierIconChip}>
                <IconTrophy color="#B45309" size={14} />
              </View>
              <Text style={styles.tierBadgeText}>HẠNG VÀNG</Text>
            </View>
            <Text style={styles.tierDesc}>Ưu tiên phân công các đơn hàng cước cao.</Text>
            <View style={styles.tierProgressWrap}>
              <View style={styles.tierProgressBar}>
                <View style={[styles.tierProgressFill, { width: '72%' }]} />
              </View>
              <Text style={styles.tierProgressLabel}>Còn 28 chuyến để lên hạng Bạch Kim</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Chỉ số vận hành</Text>
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricTitle}>Tỷ lệ nhận đơn</Text>
              <Text style={styles.metricSub}>Chuẩn hệ thống: &gt; 85%</Text>
            </View>
            <Text style={styles.metricValue}>96.2%</Text>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricTitle}>Tỷ lệ hoàn thành đúng giờ</Text>
              <Text style={styles.metricSub}>Chuẩn hệ thống: &gt; 90%</Text>
            </View>
            <Text style={styles.metricValue}>98.5%</Text>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricTitle}>Tỷ lệ nộp POD hợp lệ</Text>
              <Text style={styles.metricSub}>Chuẩn hệ thống: 100%</Text>
            </View>
            <Text style={styles.metricValue}>100%</Text>
          </View>

          <View style={[styles.metricRow, styles.metricRowLast]}>
            <View style={styles.metricLeft}>
              <Text style={styles.metricTitle}>Tỷ lệ hủy chuyến</Text>
              <Text style={styles.metricSub}>Chuẩn hệ thống: &lt; 3%</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.success.background }]}>1.2%</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Đánh giá gần đây</Text>
        <FlatList
          contentContainerStyle={styles.reviewList}
          data={mockReviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <StarRating rating={item.rating} size={12} />
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
  overviewCard: {
    backgroundColor: colors.operational.ink,
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  ratingBox: {
    alignItems: 'center',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderRightWidth: 1,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  ratingNumber: {
    color: colors.brand.softBackground,
    fontSize: 32,
    fontWeight: '800',
  },
  ratingStars: {
    color: leopardPalette.accentYellow,
    fontSize: 14,
    marginTop: 2,
  },
  ratingCount: {
    color: colors.operational.inkMuted,
    fontSize: 11,
    marginTop: 2,
  },
  tierBox: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  tierBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.warning.background,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierIconChip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeText: {
    color: colors.warning.text,
    fontSize: 11,
    fontWeight: '800',
  },
  tierDesc: {
    color: colors.operational.inkMuted,
    fontSize: 12.5,
    lineHeight: 17,
  },
  tierProgressWrap: {
    gap: 4,
    marginTop: 6,
  },
  tierProgressBar: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    height: 6,
    width: '100%',
  },
  tierProgressFill: {
    backgroundColor: colors.warning.border,
    borderRadius: 3,
    height: 6,
  },
  tierProgressLabel: {
    color: colors.operational.inkMuted,
    fontSize: 10.5,
  },
  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  metricsCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  metricRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.rowDivider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  metricRowLast: {
    borderBottomWidth: 0,
  },
  metricLeft: {
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
    color: colors.brand.background,
    fontSize: 16,
    fontWeight: '800',
  },
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
  reviewStars: {
    color: leopardPalette.accentYellow,
    fontSize: 14,
  },
  reviewTime: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
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
