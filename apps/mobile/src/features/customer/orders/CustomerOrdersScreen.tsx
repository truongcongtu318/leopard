import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ListRenderItemInfo } from 'react-native';
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { OrderStatus } from '@leopard/shared';
import {
  Button,
  colors,
  customerPalette,
  IconClock,
  IconRoute,
  IconSpeedTruck,
  iosContinuousCurve,
  layout,
  leopardPalette,
  radius,
  ScreenScaffold,
  ScreenState,
  SkeletonCard,
  SkeletonBar,
  StatusBadge,
  haptic,
  spacing,
  typography,
  typeScale,
} from '@leopard/mobile-core';
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
  'IN_TRANSIT',
];

// ── Helpers ──────────────────────────────────────────────────────────

function isActiveOrder(status: OrderStatus): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

function getActiveOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'REQUESTED': return 'Đang tìm tài xế';
    case 'ACCEPTED': return 'Tài xế đã nhận';
    case 'PICKING_UP': return 'Đang đến lấy hàng';
    case 'IN_TRANSIT': return 'Đang vận chuyển';
    default: return status;
  }
}

function getActiveStatusAccentColor(status: OrderStatus): string {
  switch (status) {
    case 'REQUESTED': return colors.warning.text;
    case 'ACCEPTED': return customerPalette.primary;
    case 'PICKING_UP': return customerPalette.primary;
    case 'IN_TRANSIT': return colors.success.text;
    default: return customerPalette.primary;
  }
}

// ── Animated pulse dot ───────────────────────────────────────────────

const PulseDot = React.memo(function PulseDot({
  color,
  size = 8,
}: Readonly<{ color: string; size?: number }>) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 2,
          height: size * 2,
          borderRadius: size,
          backgroundColor: color,
          opacity: 0.25,
          transform: [{ scale: pulseAnim }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
});

// ── iOS 18 Segmented Control ─────────────────────────────────────────

function AppleSegmentedControl({
  activeSegment,
  activeCount,
  onSegmentChange,
}: Readonly<{
  activeSegment: OrdersSegment;
  activeCount: number;
  onSegmentChange: (segment: OrdersSegment) => void;
}>) {
  return (
    <View accessibilityRole="tablist" style={s.segmentedBar}>
      <Pressable
        accessibilityLabel={`Đang giao${activeCount > 0 ? ` (${activeCount})` : ''}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSegment === 'active' }}
        onPress={() => { haptic.selection(); onSegmentChange('active'); }}
        style={[s.segmentTab, activeSegment === 'active' && s.segmentTabActive]}
      >
        {activeCount > 0 ? <PulseDot color={customerPalette.onlineGreen} size={5} /> : null}
        <Text style={[s.segmentLabel, activeSegment === 'active' && s.segmentLabelActive]}>
          Đang giao
        </Text>
        {activeCount > 0 ? (
          <View style={s.segmentBadge}>
            <Text style={s.segmentBadgeText}>{activeCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityLabel="Lịch sử"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSegment === 'all' }}
        onPress={() => { haptic.selection(); onSegmentChange('all'); }}
        style={[s.segmentTab, activeSegment === 'all' && s.segmentTabActive]}
      >
        <Text style={[s.segmentLabel, activeSegment === 'all' && s.segmentLabelActive]}>
          Lịch sử
        </Text>
      </Pressable>
    </View>
  );
}

// ── Inline Filter Bar (local, no callback) ───────────────────────────

type LocalFilter = 'ALL' | 'DELIVERED' | 'CANCELLED';

const LOCAL_FILTERS: readonly Readonly<{ value: LocalFilter; label: string }>[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DELIVERED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

function InlineFilterBar({
  selected,
  onSelect,
  counts,
}: Readonly<{
  selected: LocalFilter;
  onSelect: (f: LocalFilter) => void;
  counts: Readonly<Record<LocalFilter, number>>;
}>) {
  return (
    <View style={s.filterBar}>
      {LOCAL_FILTERS.map((f) => {
        const isActive = f.value === selected;
        const count = counts[f.value];
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={f.value}
            onPress={() => { haptic.selection(); onSelect(f.value); }}
            style={[s.filterChip, isActive && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>
              {f.label}
            </Text>
            {count > 0 ? (
              <View style={[s.filterBadge, isActive && s.filterBadgeActive]}>
                <Text style={[s.filterBadgeText, isActive && s.filterBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Hero Active Order Card ───────────────────────────────────────────

const ActiveOrderHeroCard = React.memo(function ActiveOrderHeroCard({
  order,
  onPress,
}: Readonly<{
  order: CustomerOrderListItemView;
  onPress?: (orderId: string) => void;
}>) {
  const statusLabel = getActiveOrderStatusLabel(order.status);
  const accentColor = getActiveStatusAccentColor(order.status);

  return (
    <Pressable
      accessibilityHint="Theo dõi chuyến hàng"
      accessibilityLabel={`${order.reference}, ${statusLabel}`}
      accessibilityRole="button"
      onPress={() => { haptic.light(); onPress?.(order.id); }}
      style={({ pressed }) => [s.heroCard, pressed && s.heroCardPressed]}
    >
      {/* Dark gradient map strip */}
      <View style={s.heroMapStrip}>
        <View style={s.heroMapGradient} />
        {/* Route line overlay */}
        <View style={s.heroRouteLine}>
          <View style={[s.heroRouteEndpoint, { backgroundColor: colors.success.text }]} />
          <View style={s.heroRouteDash} />
          <View style={s.heroRouteDash} />
          <View style={s.heroRouteDash} />
          <View style={[s.heroRouteEndpoint, { backgroundColor: colors.danger.text }]} />
        </View>
        {/* Status overlay pill */}
        <View style={[s.heroStatusPill, { backgroundColor: accentColor }]}>
          <PulseDot color={colors.neutral.surface} size={4} />
          <Text style={s.heroStatusText}>{statusLabel}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={s.heroContent}>
        {/* Route info */}
        <View style={s.heroRouteInfo}>
          <View style={s.heroRoutePoint}>
            <View style={s.heroOriginDot} />
            <View style={s.heroRouteTextWrap}>
              <Text style={s.heroRouteLabel}>Lấy hàng</Text>
              <Text numberOfLines={1} style={s.heroRouteAddress}>{order.route.origin.label}</Text>
            </View>
          </View>
          <View style={s.heroRouteSeparator} />
          <View style={s.heroRoutePoint}>
            <View style={s.heroDestDot} />
            <View style={s.heroRouteTextWrap}>
              <Text style={s.heroRouteLabel}>Giao hàng</Text>
              <Text numberOfLines={1} style={s.heroRouteAddress}>{order.route.destination.label}</Text>
            </View>
          </View>
        </View>

        {/* Footer: Reference + ETA + Price */}
        <View style={s.heroFooter}>
          <View style={s.heroRefWrap}>
            <IconSpeedTruck color={colors.neutral.subtleText} size={14} />
            <Text style={s.heroRef}>{order.reference}</Text>
          </View>
          <View style={s.heroMetaRight}>
            {order.etaLabel ? (
              <View style={s.heroEtaPill}>
                <IconClock color={colors.neutral.subtleText} size={12} />
                <Text style={s.heroEtaText}>{order.etaLabel}</Text>
              </View>
            ) : null}
            {order.priceLabel ? (
              <Text style={s.heroPrice}>{order.priceLabel}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Track CTA strip */}
      <View style={s.heroTrackStrip}>
        <IconRoute color={colors.neutral.surface} size={14} />
        <Text style={s.heroTrackText}>Theo dõi chuyến hàng</Text>
        <Text style={s.heroTrackArrow}>→</Text>
      </View>
    </Pressable>
  );
});

// ── Completed Order Card (Apple-style clean) ─────────────────────────

const CompletedOrderCard = React.memo(function CompletedOrderCard({
  order,
  onPress,
}: Readonly<{
  order: CustomerOrderListItemView;
  onPress?: (orderId: string) => void;
}>) {
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <Pressable
      accessibilityHint="Xem chi tiết đơn hàng"
      accessibilityLabel={`Đơn ${order.reference}`}
      accessibilityRole="button"
      onPress={() => { haptic.light(); onPress?.(order.id); }}
      style={({ pressed }) => [s.completedCard, pressed && s.completedCardPressed]}
    >
      {/* Header: icon + reference + status */}
      <View style={s.completedHeader}>
        <View style={s.completedIconBox}>
          <IconSpeedTruck color={isDelivered ? colors.success.text : isCancelled ? colors.danger.text : customerPalette.primary} size={18} />
        </View>
        <View style={s.completedTitleWrap}>
          <Text numberOfLines={1} style={s.completedRef}>Đơn {order.reference}</Text>
          <Text numberOfLines={1} style={s.completedUpdated}>{order.updatedAtLabel}</Text>
        </View>
        <StatusBadge domain="order" status={order.status} />
      </View>

      {/* Route: horizontal compact */}
      <View style={s.completedRoute}>
        <View style={s.completedRouteFlow}>
          <View style={[s.completedDot, { backgroundColor: colors.success.text }]} />
          <Text numberOfLines={1} style={s.completedRouteText}>{order.route.origin.label}</Text>
        </View>
        <View style={s.completedArrow}>
          <View style={s.completedArrowLine} />
          <Text style={s.completedArrowHead}>›</Text>
        </View>
        <View style={s.completedRouteFlow}>
          <View style={[s.completedDot, { backgroundColor: colors.danger.text }]} />
          <Text numberOfLines={1} style={s.completedRouteText}>{order.route.destination.label}</Text>
        </View>
      </View>

      {/* Footer: price + distance */}
      <View style={s.completedFooter}>
        <Text style={s.completedPrice}>{order.priceLabel || '—'}</Text>
        {order.route.distanceLabel ? (
          <Text style={s.completedDistance}>{order.route.distanceLabel}</Text>
        ) : null}
        {order.etaLabel ? (
          <Text style={s.completedEta}>ETA dự kiến: {order.etaLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

// ── Empty Active State ───────────────────────────────────────────────

function EmptyActiveState() {
  return (
    <View style={s.emptyActive}>
      <View style={s.emptyIconOuter}>
        <View style={s.emptyIconInner}>
          <IconSpeedTruck color={leopardPalette.offlineGray} size={32} />
        </View>
      </View>
      <Text style={s.emptyTitle}>Không có chuyến đang giao</Text>
      <Text style={s.emptyBody}>
        Khi bạn đặt chuyến mới, đơn hàng đang vận chuyển sẽ hiện tại đây.
      </Text>
    </View>
  );
}

// ── Notice Banner ────────────────────────────────────────────────────

function Notice({ view }: Readonly<{ view: CustomerListContentView }>) {
  if (!view.notice) return null;
  const isError = view.contentState === 'page-error';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[s.notice, isError ? s.noticeError : s.noticeWarning]}
    >
      <Text accessibilityRole={isError ? 'alert' : undefined} style={s.noticeText}>
        {view.notice}
      </Text>
    </View>
  );
}

// ── Time Group Header ────────────────────────────────────────────────

function TimeGroupHeader({ label }: Readonly<{ label: string }>) {
  return (
    <View style={s.timeGroupHeader}>
      <Text style={s.timeGroupText}>{label}</Text>
    </View>
  );
}

// ── Loading Skeleton (Apple style) ───────────────────────────────────

function OrdersSkeleton() {
  return (
    <View style={s.skeletonWrap}>
      {/* Fake segmented control */}
      <SkeletonBar height={36} borderRadius={10} />
      {/* Fake cards */}
      <SkeletonCard>
        <SkeletonBar height={48} width="100%" borderRadius={12} />
        <SkeletonBar height={14} width="70%" />
        <SkeletonBar height={14} width="50%" />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar height={14} width="60%" />
        <SkeletonBar height={32} width="100%" />
        <SkeletonBar height={14} width="40%" />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar height={14} width="55%" />
        <SkeletonBar height={32} width="100%" />
        <SkeletonBar height={14} width="45%" />
      </SkeletonCard>
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
  const [localFilter, setLocalFilter] = useState<LocalFilter>('ALL');

  // Loading state
  if (view.kind === 'loading') {
    return (
      <ScreenScaffold title="Đơn hàng">
        <OrdersSkeleton />
      </ScreenScaffold>
    );
  }

  // Boundary states
  if (view.kind !== 'content') {
    const action =
      view.kind === 'empty'
        ? { label: 'Đặt chuyến mới', handler: onCreate }
        : view.kind === 'no-results'
          ? { label: 'Xóa bộ lọc', handler: onClearFilters }
          : { label: 'Thử lại', handler: onRetry };

    return (
      <ScreenScaffold title="Đơn hàng">
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

  // Content state
  const activeOrders = view.orders.filter((o) => isActiveOrder(o.status));
  const completedOrders = view.orders.filter((o) => !isActiveOrder(o.status));

  // Local filter on completed orders — no server round-trip
  const filteredOrders = useMemo(() => {
    if (localFilter === 'ALL') return completedOrders;
    return completedOrders.filter((o) => o.status === localFilter);
  }, [completedOrders, localFilter]);

  const filterCounts: Record<LocalFilter, number> = useMemo(() => ({
    ALL: completedOrders.length,
    DELIVERED: completedOrders.filter((o) => o.status === 'DELIVERED').length,
    CANCELLED: completedOrders.filter((o) => o.status === 'CANCELLED').length,
  }), [completedOrders]);

  // Auto-switch to active tab if there are active orders and segment is 'all'
  // ponytail: could add useEffect to auto-switch, skipping — user controls tab

  const renderActiveItem = useCallback(
    ({ item }: ListRenderItemInfo<CustomerOrderListItemView>) => (
      <ActiveOrderHeroCard
        onPress={onOpenOrder}
        order={item}
      />
    ),
    [onOpenOrder],
  );

  const renderCompletedItem = useCallback(
    ({ item }: ListRenderItemInfo<CustomerOrderListItemView>) => (
      <CompletedOrderCard
        onPress={onOpenOrder}
        order={item}
      />
    ),
    [onOpenOrder],
  );

  return (
    <ScreenScaffold
      hasFloatingNavBar
      stickyFooter={
        onCreate ? (
          <Pressable
            accessibilityLabel="Đặt chuyến mới"
            accessibilityRole="button"
            onPress={() => { haptic.light(); onCreate(); }}
            style={({ pressed }) => [s.floatingCta, pressed && s.floatingCtaPressed]}
          >
            <IconSpeedTruck color={colors.neutral.surface} size={18} />
            <Text style={s.floatingCtaText}>Đặt chuyến mới</Text>
          </Pressable>
        ) : undefined
      }
      title="Đơn hàng"
    >
      <FlatList
        contentContainerStyle={s.listContent}
        data={segment === 'active' ? activeOrders : filteredOrders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={s.headerContent}>
            {/* Apple-style Segmented Control */}
            <AppleSegmentedControl
              activeCount={activeOrders.length}
              activeSegment={segment}
              onSegmentChange={setSegment}
            />

            {/* Inline local filter in "Lịch sử" tab */}
            {segment === 'all' ? (
              <>
                <InlineFilterBar
                  counts={filterCounts}
                  onSelect={setLocalFilter}
                  selected={localFilter}
                />
                <Notice view={view} />
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          segment === 'active' ? (
            <EmptyActiveState />
          ) : null
        }
        ListFooterComponent={
          segment === 'all' && (view.canLoadMore || view.contentState === 'page-error') ? (
            <View style={s.loadMoreContainer}>
              <Button
                isLoading={view.isLoadingMore}
                label={view.contentState === 'page-error' ? 'Thử tải thêm' : 'Tải thêm'}
                loadingLabel="Đang tải..."
                onPress={onLoadMore}
                variant="secondary"
              />
            </View>
          ) : null
        }
        renderItem={segment === 'active' ? renderActiveItem : renderCompletedItem}
        showsVerticalScrollIndicator={false}
      />
    </ScreenScaffold>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // List
  listContent: {
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance + spacing.xl,
  },
  headerContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxs,
  },

  // Skeleton
  skeletonWrap: {
    gap: spacing.sm,
  },

  // ─── iOS 18 Segmented Control ──────────────────────────────────
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    padding: spacing.hairline,
    gap: spacing.hairline,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
  },
  segmentTabActive: {
    backgroundColor: colors.neutral.surface,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
  },
  segmentLabel: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: colors.neutral.subtleText,
  },
  segmentLabelActive: {
    fontWeight: '600',
    color: colors.neutral.text,
  },
  segmentBadge: {
    backgroundColor: customerPalette.onlineGreen,
    borderRadius: radius.pill,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    color: colors.neutral.surface,
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ─── Inline Filter Bar ─────────────────────────────────────────
  filterBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: customerPalette.primary,
  },
  filterChipText: {
    ...typeScale.footnote,
    fontWeight: '500',
    color: colors.neutral.subtleText,
  },
  filterChipTextActive: {
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: radius.cardSm,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    marginLeft: spacing.xxs,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.neutral.mutedText,
  },
  filterBadgeTextActive: {
    color: colors.neutral.surface,
  },

  // ─── Hero Active Order Card ───────────────────────────────────
  heroCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    boxShadow: '0 6px 16px rgba(11, 37, 69, 0.08)',
  },
  heroCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  // Map strip
  heroMapStrip: {
    height: 72,
    backgroundColor: colors.neutral.text,
    position: 'relative',
    overflow: 'hidden',
  },
  heroMapGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.neutral.text,
    opacity: 0.9,
  },
  heroRouteLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '50%',
    marginTop: -3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroRouteEndpoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  heroRouteDash: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
  },
  heroStatusPill: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  heroStatusText: {
    color: colors.neutral.surface,
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Content
  heroContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  heroRouteInfo: {
    gap: spacing.xs,
  },
  heroRoutePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroOriginDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success.text,
  },
  heroDestDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.danger.text,
  },
  heroRouteTextWrap: {
    flex: 1,
  },
  heroRouteLabel: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: colors.neutral.subtleText,
    letterSpacing: 0.5,
  },
  heroRouteAddress: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.neutral.text,
    marginTop: spacing.hairline,
  },
  heroRouteSeparator: {
    marginLeft: spacing.xxs,
    width: 2,
    height: 8,
    backgroundColor: colors.neutral.border,
    borderRadius: 1,
  },

  // Footer
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.neutral.surfaceMuted,
    paddingTop: spacing.xs,
  },
  heroRefWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  heroRef: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: colors.neutral.subtleText,
    fontVariant: ['tabular-nums'],
  },
  heroMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroEtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: '#F0F4F9',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  heroEtaText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  heroPrice: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },

  // Track strip
  heroTrackStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.primary,
    paddingVertical: spacing.sm,
  },
  heroTrackText: {
    color: colors.neutral.surface,
    ...typeScale.footnote,
    fontWeight: '700',
  },
  heroTrackArrow: {
    color: 'rgba(255,255,255,0.6)',
    ...typeScale.callout,
    fontWeight: '700',
  },

  // ─── Completed Order Card ─────────────────────────────────────
  completedCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.surfaceMuted,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  },
  completedCardPressed: {
    opacity: 0.88,
    backgroundColor: '#FAFBFC',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completedIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  completedRef: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  completedUpdated: {
    ...typeScale.caption1,
    color: colors.neutral.subtleText,
    marginTop: spacing.hairline,
  },

  // Route horizontal compact
  completedRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.bgMuted,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  completedRouteFlow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  completedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  completedRouteText: {
    ...typeScale.caption1,
    fontWeight: '500',
    color: colors.neutral.mutedText,
    flex: 1,
  },
  completedArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.hairline,
    paddingHorizontal: spacing.hairline,
  },
  completedArrowLine: {
    width: 12,
    height: 1.5,
    backgroundColor: colors.neutral.subtleBorder,
    borderRadius: 1,
  },
  completedArrowHead: {
    ...typeScale.subheadline,
    color: colors.neutral.subtleBorder,
    fontWeight: '700',
    lineHeight: 14,
  },

  // Footer
  completedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.hairline,
  },
  completedPrice: {
    ...typeScale.callout,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  completedDistance: {
    ...typeScale.caption1,
    fontWeight: '500',
    color: colors.neutral.subtleText,
  },
  completedEta: {
    ...typeScale.caption2,
    fontWeight: '500',
    color: colors.neutral.subtleText,
  },

  // ─── Empty State ──────────────────────────────────────────────
  emptyActive: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typeScale.headline,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  emptyBody: {
    ...typeScale.subheadline,
    fontWeight: '400',
    color: colors.neutral.subtleText,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ─── Notice ───────────────────────────────────────────────────
  notice: {
    borderRadius: radius.control,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
    ...typeScale.footnote,
    fontWeight: '500',
    color: colors.neutral.text,
    lineHeight: 18,
  },

  // ─── Time group ───────────────────────────────────────────────
  timeGroupHeader: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.hairline,
  },
  timeGroupText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: colors.neutral.subtleText,
    letterSpacing: 0.3,
  },

  // ─── Floating CTA ─────────────────────────────────────────────
  floatingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.primary,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    boxShadow: '0 6px 14px rgba(11, 37, 69, 0.2)',
  },
  floatingCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  floatingCtaText: {
    color: colors.neutral.surface,
    ...typeScale.subheadline,
    fontWeight: '700',
  },

  // Load more
  loadMoreContainer: {
    paddingTop: spacing.xxs,
  },

  // Shared
  pressed: {
    opacity: 0.85,
  },
});
