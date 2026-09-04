import type { ListRenderItemInfo } from 'react-native';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
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
      title="Đơn hàng của tôi"
    >
      <FlatList
        contentContainerStyle={styles.listContent}
        data={view.orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            {/* Horizontal Filter Bar */}
            <ScrollView
              accessibilityRole="toolbar"
              contentContainerStyle={styles.filtersScroll}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {filters.map((filter) => (
                <FilterChip
                  key={filter.value}
                  label={filter.label}
                  onPress={onSelectStatus ? () => onSelectStatus(filter.value) : undefined}
                  selected={view.selectedFilter === filter.value}
                />
              ))}
            </ScrollView>

            <Notice view={view} />
            <SectionHeading title="Hành trình gần đây" />
          </View>
        }
        ListFooterComponent={
          view.canLoadMore || view.contentState === 'page-error' ? (
            <View style={styles.loadMoreContainer}>
              <Button
                isLoading={view.isLoadingMore}
                label={view.contentState === 'page-error' ? 'Thử tải thêm' : 'Tải thêm đơn hàng'}
                loadingLabel="Đang tải thêm"
                onPress={onLoadMore}
                variant="secondary"
              />
            </View>
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
    paddingBottom: spacing.xl,
  },
  headerContent: {
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  skeletonList: {
    gap: spacing.sm,
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  filter: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  filterSelected: {
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.background,
  },
  filterLabel: {
    color: colors.neutral.mutedText,
    fontSize: 13,
    fontWeight: '500',
  },
  filterLabelSelected: {
    color: colors.brand.softText,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
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
  loadMoreContainer: {
    paddingTop: spacing.xs,
  },
});
