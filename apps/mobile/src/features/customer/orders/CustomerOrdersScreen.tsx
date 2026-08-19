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
      <ScreenScaffold
        eyebrow="CUSTOMER · SỔ HÀNH TRÌNH"
        title="Đơn hàng của tôi"
        subtitle="Theo dõi các đơn thuộc tài khoản này."
      >
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
    <ScreenScaffold
      eyebrow="CUSTOMER · SỔ HÀNH TRÌNH"
      title="Đơn hàng của tôi"
      subtitle={view.resultLabel}
    >
      <FlatList
        contentContainerStyle={styles.listContent}
        data={view.orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.actionRail}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionEyebrow}>TUYẾN MỚI</Text>
                <Text accessibilityRole="header" style={styles.actionTitle}>
                  Bắt đầu một hành trình
                </Text>
                <Text style={styles.actionDescription}>
                  Khai báo lộ trình, loại xe và nhận estimate trước khi xác nhận.
                </Text>
              </View>
              <Button label="Tạo đơn mới" onPress={onCreate} />
            </View>
            <View style={styles.filterLedger}>
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
            </View>
            <Notice view={view} />
            <SectionHeading
              description={`${view.orders.length} đơn đang hiển thị · ưu tiên trạng thái và ETA`}
              title="Hành trình gần đây"
            />
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
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xs,
  },
  actionRail: {
    backgroundColor: colors.operational.ink,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    gap: spacing.md,
    padding: spacing.md,
  },
  actionCopy: { gap: spacing.xs },
  actionEyebrow: {
    ...typography.caption,
    color: colors.brand.softBackground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  actionTitle: {
    ...typography.sectionTitle,
    color: colors.brand.text,
    flexShrink: 1,
  },
  actionDescription: {
    ...typography.body,
    color: colors.operational.inkMuted,
    flexShrink: 1,
  },
  filterLedger: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
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
