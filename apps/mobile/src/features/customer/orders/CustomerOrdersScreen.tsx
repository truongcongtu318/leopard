import type { ListRenderItemInfo } from 'react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { OrderSummary } from '../../../ui/OrderSummary';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { SkeletonCard } from '../../../ui/Skeleton';
import type {
  CustomerListContentView,
  CustomerListView,
  CustomerOrderFilter,
  CustomerOrderListItemView,
} from './model';

export type CustomerOrdersScreenProps = Readonly<{
  view: CustomerListView;
  onCreate?: () => void;
  onOpenOrder?: (orderId: string) => void;
  onSelectStatus?: (filter: CustomerOrderFilter) => void;
  onClearFilters?: () => void;
  onRetry?: () => void;
  onLoadMore?: () => void;
}>;

const filters: readonly Readonly<{ value: CustomerOrderFilter; label: string }>[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'REQUESTED', label: 'Chờ tài xế' },
  { value: 'IN_TRANSIT', label: 'Đang vận chuyển' },
  { value: 'DELIVERED', label: 'Đã giao' },
];

function FilterChip({
  label,
  onPress,
  selected,
}: Readonly<{ label: string; selected: boolean; onPress?: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filter,
        selected ? styles.filterSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.filterLabel, selected ? styles.filterLabelSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Notice({ view }: Readonly<{ view: CustomerListContentView }>) {
  if (!view.notice) return null;
  const isError = view.contentState === 'page-error';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, isError ? styles.noticeError : styles.noticeWarning]}
    >
      <Text accessibilityRole={isError ? 'alert' : undefined} style={styles.noticeText}>
        {view.notice}
      </Text>
    </View>
  );
}

export function CustomerOrdersScreen({
  onClearFilters,
  onCreate,
  onLoadMore,
  onOpenOrder,
  onRetry,
  onSelectStatus,
  view,
}: CustomerOrdersScreenProps) {
  if (view.kind === 'loading') {
    return (
      <ScreenScaffold
        eyebrow="CUSTOMER · SỔ HÀNH TRÌNH"
        subtitle="Bố cục danh sách được giữ ổn định trong khi chờ dữ liệu."
        title="Đơn hàng của tôi"
      >
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </ScreenScaffold>
    );
  }

  if (view.kind !== 'content') {
    const action =
      view.kind === 'empty'
        ? { label: 'Tạo đơn mới', handler: onCreate }
        : view.kind === 'no-results'
          ? { label: 'Xóa bộ lọc', handler: onClearFilters }
          : { label: 'Thử lại', handler: onRetry };

    return (
      <ScreenScaffold eyebrow="CUSTOMER · SỔ HÀNH TRÌNH" title="Đơn hàng của tôi">
        <ScreenState
          actionLabel={action.label}
          message={view.message}
          onAction={action.handler}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  const renderOrder = ({ item }: ListRenderItemInfo<CustomerOrderListItemView>) => (
    <OrderSummary
      destination={item.route.destination}
      metadata={[
        { id: 'eta', label: 'ETA dự kiến', value: item.etaLabel },
        { id: 'price', label: 'Giá cước', value: item.priceLabel },
        { id: 'updated', label: 'Cập nhật', value: item.updatedAtLabel },
      ]}
      onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
      orderReference={item.reference}
      origin={item.route.origin}
      status={item.status}
      stops={item.route.stops}
    />
  );

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · SỔ HÀNH TRÌNH"
      stickyFooter={
        onCreate ? (
          <Button
            label="Tạo đơn mới"
            onPress={onCreate}
            size="driver-primary"
            variant="primary"
          />
        ) : undefined
      }
      subtitle="Theo dõi lộ trình, trạng thái vận chuyển và hoá đơn VAT điện tử."
      title="Đơn hàng của tôi"
    >
      <FlatList
        contentContainerStyle={styles.listContent}
        data={view.orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            {/* 4 Metrics summary */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardTitle}>ĐANG VẬN CHUYỂN</Text>
                </View>
                <Text style={styles.metricValue}>2 đơn</Text>
                <View style={styles.metricFooter}>
                  <Text style={styles.metricTagBlue}>1 xe tải • 1 ba gác</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardTitle}>HOÀN THÀNH (THÁNG)</Text>
                </View>
                <Text style={styles.metricValueGreen}>389 chuyến</Text>
                <View style={styles.metricFooter}>
                  <Text style={styles.metricTagGreen}>Tỷ lệ đạt 99.2%</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardTitle}>TỔNG CƯỚC THÁNG</Text>
                </View>
                <Text style={styles.metricValueAmber}>48.2M ₫</Text>
                <View style={styles.metricFooter}>
                  <Text style={styles.metricTagAmber}>Ba gác: 112 • Tải: 277</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardTitle}>ETA CHÍNH XÁC (AI)</Text>
                </View>
                <Text style={styles.metricValueSky}>94%</Text>
                <View style={styles.metricFooter}>
                  <Text style={styles.metricTagSky}>Dự báo Traffic & AI</Text>
                </View>
              </View>
            </View>

            <View accessibilityRole="toolbar" style={styles.filters}>
              {filters.map((filter) => (
                <FilterChip
                  key={filter.value}
                  label={filter.label}
                  onPress={onSelectStatus ? () => onSelectStatus(filter.value) : undefined}
                  selected={view.selectedFilter === filter.value}
                />
              ))}
            </View>
            <Notice view={view} />
            <SectionHeading title="Hành trình gần đây" />
          </View>
        }
        ListFooterComponent={
          view.canLoadMore || view.contentState === 'page-error' ? (
            <Button
              isLoading={view.isLoadingMore}
              label={view.contentState === 'page-error' ? 'Thử tải thêm' : 'Tải thêm đơn hàng'}
              loadingLabel="Đang tải thêm"
              onPress={onLoadMore}
              variant="secondary"
            />
          ) : null
        }
        renderItem={renderOrder}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  metricCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 2,
    minHeight: 76,
    padding: spacing.sm,
  },
  metricCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCardTitle: {
    color: colors.neutral.mutedText,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  metricValue: {
    color: colors.brand.background,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  metricValueGreen: {
    color: colors.success.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  metricValueAmber: {
    color: colors.warning.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  metricValueSky: {
    color: colors.neutral.titleText,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  metricFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  metricTagBlue: {
    ...typography.caption,
    color: colors.brand.softText,
    fontSize: 10.5,
  },
  metricTagGreen: {
    ...typography.caption,
    color: colors.success.text,
    fontSize: 10.5,
  },
  metricTagAmber: {
    ...typography.caption,
    color: colors.warning.text,
    fontSize: 10.5,
  },
  metricTagSky: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    fontSize: 10.5,
  },
  skeletonList: {
    gap: spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 2,
  },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterSelected: {
    backgroundColor: leopardPalette.primaryBg,
    borderColor: leopardPalette.primary,
  },
  filterLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
    fontWeight: '500',
  },
  filterLabelSelected: {
    color: leopardPalette.primary,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  notice: {
    borderRadius: radius.control,
    gap: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeWarning: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderWidth: 1,
  },
  noticeError: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: 1,
  },
  noticeText: {
    ...typography.caption,
    color: colors.neutral.text,
    fontWeight: '600',
    lineHeight: 18,
  },
});
