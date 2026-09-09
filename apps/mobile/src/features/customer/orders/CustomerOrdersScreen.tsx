import { useState } from 'react';
import type { ListRenderItemInfo } from 'react-native';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '@leopard/shared';
import { colors, layout, radius, spacing, typography } from '@leopard/mobile-core';
import { Button } from '../../../ui/Button';
import { IconSpeedTruck } from '../../../ui/icons/CoreIcons';
import { OrderSummary } from '../../../ui/OrderSummary';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { SkeletonCard } from '../../../ui/Skeleton';
import { StatusBadge } from '../../../ui/StatusBadge';
import type {
  CustomerListContentView,
  CustomerListView,
  CustomerOrderFilter,
  CustomerOrderListItemView,
} from './model';

// ── Types ────────────────────────────────────────────────────────────

export type OrdersSegment = 'active' | 'all';

export type CustomerOrdersScreenProps = Readonly<{
  view: CustomerListView;
  onCreate?: () => void;
  onOpenOrder?: (orderId: string) => void;
  onSelectStatus?: (filter: CustomerOrderFilter) => void;
  onClearFilters?: () => void;
  onRetry?: () => void;
  onLoadMore?: () => void;
}>;

// ── Constants ────────────────────────────────────────────────────────

const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'PICKED_UP',
  'IN_TRANSIT',
];

const filters: readonly Readonly<{ value: CustomerOrderFilter; label: string }>[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'REQUESTED', label: 'Chờ tài xế' },
  { value: 'IN_TRANSIT', label: 'Đang vận chuyển' },
  { value: 'DELIVERED', label: 'Đã giao' },
];

// ── Helpers ──────────────────────────────────────────────────────────

function isActiveOrder(status: OrderStatus): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

function getActiveOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'REQUESTED':
      return 'Chờ tài xế nhận';
    case 'ACCEPTED':
      return 'Tài xế đã nhận';
    case 'PICKING_UP':
      return 'Đang đến lấy hàng';
    case 'PICKED_UP':
      return 'Đã lấy hàng';
    case 'IN_TRANSIT':
      return 'Đang vận chuyển';
    default:
      return status;
  }
}

// ── Sub-components ───────────────────────────────────────────────────

function SegmentedControl({
  activeSegment,
  activeCount,
  onSegmentChange,
}: Readonly<{
  activeSegment: OrdersSegment;
  activeCount: number;
  onSegmentChange: (segment: OrdersSegment) => void;
}>) {
  return (
    <View accessibilityRole="tablist" style={styles.segmentedBar}>
      <Pressable
        accessibilityLabel={`Đang giao${activeCount > 0 ? ` (${activeCount})` : ''}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSegment === 'active' }}
        onPress={() => onSegmentChange('active')}
        style={[
          styles.segmentTab,
          activeSegment === 'active' ? styles.segmentTabActive : null,
        ]}
      >
        {activeCount > 0 ? <View style={styles.segmentLiveDot} /> : null}
        <Text
          style={[
            styles.segmentLabel,
            activeSegment === 'active' ? styles.segmentLabelActive : null,
          ]}
        >
          Đang giao
        </Text>
        {activeCount > 0 ? (
          <View style={styles.segmentBadge}>
            <Text style={styles.segmentBadgeText}>{activeCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityLabel="Tất cả đơn hàng"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSegment === 'all' }}
        onPress={() => onSegmentChange('all')}
        style={[
          styles.segmentTab,
          activeSegment === 'all' ? styles.segmentTabActive : null,
        ]}
      >
        <Text
          style={[
            styles.segmentLabel,
            activeSegment === 'all' ? styles.segmentLabelActive : null,
          ]}
        >
          Tất cả đơn hàng
        </Text>
      </Pressable>
    </View>
  );
}

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

function ActiveOrderCard({
  order,
  onPress,
}: Readonly<{
  order: CustomerOrderListItemView;
  onPress?: () => void;
}>) {
  const statusLabel = getActiveOrderStatusLabel(order.status);

  return (
    <Pressable
      accessibilityHint="Mở chi tiết đơn hàng"
      accessibilityLabel={`${order.reference}, ${statusLabel}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.activeCard,
        pressed ? styles.activeCardPressed : null,
      ]}
    >
      {/* Header: status + reference */}
      <View style={styles.activeCardHeader}>
        <StatusBadge domain="order" status={order.status} />
        <Text numberOfLines={1} style={styles.activeCardRef}>
          {order.reference}
        </Text>
      </View>

      {/* Route: origin → destination */}
      <View style={styles.activeCardRoute}>
        <View style={styles.activeRouteLine}>
          <View style={styles.routeDotOrigin} />
          <View style={styles.routeConnector} />
          <View style={styles.routeDotDest} />
        </View>
        <View style={styles.activeRouteLabels}>
          <Text numberOfLines={1} style={styles.routeLabel}>
            {order.route.origin.label}
          </Text>
          <Text numberOfLines={1} style={styles.routeLabel}>
            {order.route.destination.label}
          </Text>
        </View>
      </View>

      {/* Footer: meta + action */}
      <View style={styles.activeCardFooter}>
        <View style={styles.activeCardMeta}>
          {order.etaLabel ? (
            <Text numberOfLines={1} style={styles.activeEtaText}>
              Thời gian dự kiến: {order.etaLabel}
            </Text>
          ) : null}
          {order.priceLabel ? (
            <Text numberOfLines={1} style={styles.activePriceText}>
              {order.priceLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.activeTrackPill}>
          <IconSpeedTruck color="#0B1E42" size={14} />
          <Text style={styles.activeTrackText}>Theo dõi</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyActiveState({ onCreate }: Readonly<{ onCreate?: () => void }>) {
  return (
    <View style={styles.emptyActive}>
      <View style={styles.emptyActiveIconBox}>
        <IconSpeedTruck color="#94A3B8" size={28} />
      </View>
      <Text style={styles.emptyActiveTitle}>Chưa có chuyến đang giao</Text>
      <Text style={styles.emptyActiveBody}>
        Khi bạn tạo đơn mới và tài xế nhận chuyến, đơn hàng sẽ hiển thị ở đây.
      </Text>
      {onCreate ? (
        <Button
          label="Tạo đơn mới"
          onPress={onCreate}
          size="driver-primary"
          variant="primary"
        />
      ) : null}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

export function CustomerOrdersScreen({
  onClearFilters,
  onCreate,
  onLoadMore,
  onOpenOrder,
  onRetry,
  onSelectStatus,
  view,
}: CustomerOrdersScreenProps) {
  const [segment, setSegment] = useState<OrdersSegment>('all');

  if (view.kind === 'loading') {
    return (
      <ScreenScaffold
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
      <ScreenScaffold title="Đơn hàng của tôi">
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

  // Partition orders into active vs all
  const activeOrders = view.orders.filter((o) => isActiveOrder(o.status));

  const renderOrder = ({ item }: ListRenderItemInfo<CustomerOrderListItemView>) => (
    <OrderSummary
      destination={item.route.destination}
      metadata={[
        { id: 'eta', label: 'Thời gian dự kiến', value: item.etaLabel },
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
      hasFloatingNavBar
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
        data={segment === 'active' ? activeOrders : view.orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            {/* Segmented Control: "Đang giao" | "Tất cả đơn hàng" */}
            <SegmentedControl
              activeCount={activeOrders.length}
              activeSegment={segment}
              onSegmentChange={setSegment}
            />

            {/* Sub-filters only visible in "Tất cả" mode */}
            {segment === 'all' ? (
              <>
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
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          segment === 'active' ? (
            <EmptyActiveState onCreate={onCreate} />
          ) : null
        }
        ListFooterComponent={
          segment === 'all' && (view.canLoadMore || view.contentState === 'page-error') ? (
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
        renderItem={
          segment === 'active'
            ? ({ item }) => (
                <ActiveOrderCard
                  onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
                  order={item}
                />
              )
            : renderOrder
        }
      />
    </ScreenScaffold>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance,
  },
  headerContent: {
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  skeletonList: {
    gap: spacing.sm,
  },

  // Segmented Control
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.control,
    padding: 3,
    gap: 2,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.control - 1,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentLabelActive: {
    fontWeight: '700',
    color: '#0F172A',
  },
  segmentBadge: {
    backgroundColor: '#0B1E42',
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Filter Chips (All segment)
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

  // Active Order Card
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeCardPressed: {
    opacity: 0.88,
    backgroundColor: '#F0F4F9',
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeCardRef: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 'auto' as const,
  },
  activeCardRoute: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activeRouteLine: {
    width: 12,
    alignItems: 'center',
    paddingVertical: 2,
  },
  routeDotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0B1E42',
  },
  routeConnector: {
    flex: 1,
    width: 2,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  routeDotDest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeRouteLabels: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  routeLabel: {
    ...typography.caption,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 18,
  },
  activeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.xs,
  },
  activeCardMeta: {
    flex: 1,
    gap: 2,
  },
  activeEtaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1E42',
  },
  activePriceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTrackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4F9',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeTrackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1E42',
  },

  // Empty Active State
  emptyActive: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyActiveIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyActiveTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyActiveBody: {
    ...typography.body,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Shared
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
