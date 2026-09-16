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
    case 'REQUESTED': return '#F59E0B';
    case 'ACCEPTED': return '#0B1E42';
    case 'PICKING_UP': return '#0B1E42';
    case 'IN_TRANSIT': return '#16A34A';
    default: return '#0B1E42';
  }
}

// ── Animated pulse dot ───────────────────────────────────────────────

function PulseDot({ color, size = 8 }: Readonly<{ color: string; size?: number }>) {
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
}

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
        {activeCount > 0 ? <PulseDot color="#16A34A" size={5} /> : null}
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

function ActiveOrderHeroCard({
  order,
  onPress,
}: Readonly<{
  order: CustomerOrderListItemView;
  onPress?: () => void;
}>) {
  const statusLabel = getActiveOrderStatusLabel(order.status);
  const accentColor = getActiveStatusAccentColor(order.status);

  return (
    <Pressable
      accessibilityHint="Theo dõi chuyến hàng"
      accessibilityLabel={`${order.reference}, ${statusLabel}`}
      accessibilityRole="button"
      onPress={() => { haptic.light(); onPress?.(); }}
      style={({ pressed }) => [s.heroCard, pressed && s.heroCardPressed]}
    >
      {/* Dark gradient map strip */}
      <View style={s.heroMapStrip}>
        <View style={s.heroMapGradient} />
        {/* Route line overlay */}
        <View style={s.heroRouteLine}>
          <View style={[s.heroRouteEndpoint, { backgroundColor: '#16A34A' }]} />
          <View style={s.heroRouteDash} />
          <View style={s.heroRouteDash} />
          <View style={s.heroRouteDash} />
          <View style={[s.heroRouteEndpoint, { backgroundColor: '#DC2626' }]} />
        </View>
        {/* Status overlay pill */}
        <View style={[s.heroStatusPill, { backgroundColor: accentColor }]}>
          <PulseDot color="#FFFFFF" size={4} />
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
              <Text style={s.heroRouteLabel}>LẤY HÀNG</Text>
              <Text numberOfLines={1} style={s.heroRouteAddress}>{order.route.origin.label}</Text>
            </View>
          </View>
          <View style={s.heroRouteSeparator} />
          <View style={s.heroRoutePoint}>
            <View style={s.heroDestDot} />
            <View style={s.heroRouteTextWrap}>
              <Text style={s.heroRouteLabel}>GIAO HÀNG</Text>
              <Text numberOfLines={1} style={s.heroRouteAddress}>{order.route.destination.label}</Text>
            </View>
          </View>
        </View>

        {/* Footer: Reference + ETA + Price */}
        <View style={s.heroFooter}>
          <View style={s.heroRefWrap}>
            <IconSpeedTruck color="#64748B" size={14} />
            <Text style={s.heroRef}>{order.reference}</Text>
          </View>
          <View style={s.heroMetaRight}>
            {order.etaLabel ? (
              <View style={s.heroEtaPill}>
                <IconClock color="#64748B" size={12} />
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
        <IconRoute color="#FFFFFF" size={14} />
        <Text style={s.heroTrackText}>Theo dõi chuyến hàng</Text>
        <Text style={s.heroTrackArrow}>→</Text>
      </View>
    </Pressable>
  );
}

// ── Completed Order Card (Apple-style clean) ─────────────────────────

function CompletedOrderCard({
  order,
  onPress,
}: Readonly<{
  order: CustomerOrderListItemView;
  onPress?: () => void;
}>) {
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <Pressable
      accessibilityHint="Xem chi tiết đơn hàng"
      accessibilityLabel={`Đơn ${order.reference}`}
      accessibilityRole="button"
      onPress={() => { haptic.light(); onPress?.(); }}
      style={({ pressed }) => [s.completedCard, pressed && s.completedCardPressed]}
    >
      {/* Header: icon + reference + status */}
      <View style={s.completedHeader}>
        <View style={s.completedIconBox}>
          <IconSpeedTruck color={isDelivered ? '#16A34A' : isCancelled ? '#DC2626' : '#0B1E42'} size={18} />
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
          <View style={[s.completedDot, { backgroundColor: '#16A34A' }]} />
          <Text numberOfLines={1} style={s.completedRouteText}>{order.route.origin.label}</Text>
        </View>
        <View style={s.completedArrow}>
          <View style={s.completedArrowLine} />
          <Text style={s.completedArrowHead}>›</Text>
        </View>
        <View style={s.completedRouteFlow}>
          <View style={[s.completedDot, { backgroundColor: '#DC2626' }]} />
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
}

// ── Empty Active State ───────────────────────────────────────────────

function EmptyActiveState() {
  return (
    <View style={s.emptyActive}>
      <View style={s.emptyIconOuter}>
        <View style={s.emptyIconInner}>
          <IconSpeedTruck color="#94A3B8" size={32} />
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

  const renderActiveItem = ({ item }: ListRenderItemInfo<CustomerOrderListItemView>) => (
    <ActiveOrderHeroCard
      onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
      order={item}
    />
  );

  const renderCompletedItem = ({ item }: ListRenderItemInfo<CustomerOrderListItemView>) => (
    <CompletedOrderCard
      onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
      order={item}
    />
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
            <IconSpeedTruck color="#FFFFFF" size={18} />
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
    gap: 10,
    paddingBottom: layout.bottomNavClearance + 28,
  },
  headerContent: {
    gap: 10,
    paddingBottom: 4,
  },

  // Skeleton
  skeletonWrap: {
    gap: 12,
  },

  // ─── iOS 18 Segmented Control ──────────────────────────────────
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    ...iosContinuousCurve,
    padding: 3,
    gap: 3,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    ...iosContinuousCurve,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentLabel: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentLabelActive: {
    fontWeight: '600',
    color: '#0F172A',
  },
  segmentBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ─── Inline Filter Bar ─────────────────────────────────────────
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    ...iosContinuousCurve,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#0B1E42',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#475569',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },

  // ─── Hero Active Order Card ───────────────────────────────────
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    ...iosContinuousCurve,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  // Map strip
  heroMapStrip: {
    height: 72,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  heroMapGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0F172A',
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
    gap: 6,
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
    top: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Content
  heroContent: {
    padding: 14,
    gap: 12,
  },
  heroRouteInfo: {
    gap: 8,
  },
  heroRoutePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroOriginDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  heroDestDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  heroRouteTextWrap: {
    flex: 1,
  },
  heroRouteLabel: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  heroRouteAddress: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
  },
  heroRouteSeparator: {
    marginLeft: 4,
    width: 2,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },

  // Footer
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  heroRefWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroRef: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontVariant: ['tabular-nums'],
  },
  heroMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroEtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4F9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroEtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
  },
  heroPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
  },

  // Track strip
  heroTrackStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B1E42',
    paddingVertical: 12,
  },
  heroTrackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroTrackArrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── Completed Order Card ─────────────────────────────────────
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...iosContinuousCurve,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  completedCardPressed: {
    opacity: 0.88,
    backgroundColor: '#FAFBFC',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    ...iosContinuousCurve,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  completedRef: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  completedUpdated: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },

  // Route horizontal compact
  completedRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    ...iosContinuousCurve,
    padding: 10,
    gap: 6,
  },
  completedRouteFlow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  completedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  completedRouteText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  completedArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  completedArrowLine: {
    width: 12,
    height: 1.5,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  completedArrowHead: {
    fontSize: typeScale.subheadline.fontSize,
    color: '#CBD5E1',
    fontWeight: '700',
    lineHeight: 14,
  },

  // Footer
  completedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 2,
  },
  completedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
  },
  completedDistance: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  completedEta: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },

  // ─── Empty State ──────────────────────────────────────────────
  emptyActive: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: typeScale.body.fontSize,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ─── Notice ───────────────────────────────────────────────────
  notice: {
    borderRadius: 12,
    ...iosContinuousCurve,
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
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral.text,
    lineHeight: 18,
  },

  // ─── Time group ───────────────────────────────────────────────
  timeGroupHeader: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  timeGroupText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
  },

  // ─── Floating CTA ─────────────────────────────────────────────
  floatingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B1E42',
    borderRadius: 14,
    ...iosContinuousCurve,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 48,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  floatingCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  floatingCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Load more
  loadMoreContainer: {
    paddingTop: 4,
  },

  // Shared
  pressed: {
    opacity: 0.85,
  },
});
