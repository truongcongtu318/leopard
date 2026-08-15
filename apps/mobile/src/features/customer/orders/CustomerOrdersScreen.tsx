import type { ListRenderItemInfo } from 'react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { OrderSummary } from '../../../ui/OrderSummary';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
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
  selected,
  onPress,
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
  view,
  onCreate,
  onOpenOrder,
  onSelectStatus,
  onClearFilters,
  onRetry,
  onLoadMore,
}: CustomerOrdersScreenProps) {
  if (view.kind !== 'content') {
    const action =
      view.kind === 'empty'
        ? { label: 'Tạo đơn mới', handler: onCreate }
        : view.kind === 'no-results'
          ? { label: 'Xóa bộ lọc', handler: onClearFilters }
          : view.kind === 'error'
            ? { label: 'Thử lại', handler: onRetry }
            : undefined;
    return (
      <ScreenScaffold title="Đơn hàng của tôi" subtitle="Theo dõi các đơn thuộc tài khoản này.">
        <ScreenState
          actionLabel={action?.label}
          message={view.message}
          onAction={action?.handler}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  const renderOrder = ({ item }: ListRenderItemInfo<CustomerOrderListItemView>) => (
    <OrderSummary
      accessibilityLabel={`Đơn ${item.reference}, trạng thái ${item.status}`}
      destination={item.route.destination}
      metadata={[
        { id: 'eta', label: 'ETA dự kiến', value: item.etaLabel },
        { id: 'price', label: 'Giá dự kiến', value: item.priceLabel },
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
    <ScreenScaffold title="Đơn hàng của tôi" subtitle={view.resultLabel}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={view.orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Button label="Tạo đơn mới" onPress={onCreate} />
            <SectionHeading
              description="Bộ lọc chỉ thay đổi danh sách hiển thị, không thay đổi đơn hàng."
              title="Trạng thái"
            />
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
    paddingBottom: spacing.xl,
  },
  headerContent: {
    gap: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: control.minimumTouchHeight,
    paddingHorizontal: spacing.sm,
  },
  filterSelected: {
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.background,
  },
  filterLabel: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  filterLabelSelected: {
    color: colors.brand.softText,
  },
  pressed: {
    opacity: 0.8,
  },
  notice: {
    borderLeftWidth: 4,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  noticeWarning: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
  },
  noticeError: {
    backgroundColor: colors.danger.background,
    borderLeftColor: colors.danger.border,
  },
  noticeText: {
    ...typography.body,
    color: colors.neutral.text,
    flexShrink: 1,
  },
});
