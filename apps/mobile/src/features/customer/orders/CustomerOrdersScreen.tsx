import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, ListRenderItemInfo } from 'react-native';
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { OrderStatus } from '@leopard/shared';
import {
  Badge,
  Box,
  Button,
  colors,
  customerPalette,
  haptic,
  HStack,
  IconClock,
  IconRoute,
  IconSearch,
  IconSpeedTruck,
  Input,
  InputField,
  InputSlot,
  iosContinuousCurve,
  layout,
  leopardPalette,
  radius,
  ScreenScaffold,
  ScreenState,
  SkeletonBar,
  SkeletonCard,
  spacing,
  StatusBadge,
  typeScale,
  VStack,
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
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
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
  size = 6,
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

// ── Apple Inset Pill Segmented Control ───────────────────────────────

function AppleSegmentedControl({
  activeSegment,
  activeCount,
  onSegmentChange,
}: Readonly<{
  activeSegment: OrdersSegment;
  activeCount: number;
  onSegmentChange: (segment: OrdersSegment) => void;
}>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(activeSegment === 'active' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeSegment === 'active' ? 0 : 1,
      damping: 24,
      stiffness: 280,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }, [activeSegment, slideAnim]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const pillWidth = trackWidth > 0 ? (trackWidth - 6) / 2 : 0;
  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, pillWidth + 3],
  });

  return (
    <View
      accessibilityRole="tablist"
      onLayout={handleLayout}
      style={s.segmentedContainer}
    >
      {/* Smooth Sliding Pill Indicator */}
      {pillWidth > 0 ? (
        <Animated.View
          style={[
            s.segmentedPillIndicator,
            {
              width: pillWidth,
              transform: [{ translateX: pillTranslateX }],
            },
          ]}
        />
      ) : null}

      <Pressable
        accessibilityLabel={`Đang giao · Đang thực hiện${activeCount > 0 ? ` (${activeCount})` : ''}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSegment === 'active' }}
        onPress={() => {
          haptic.selection();
          onSegmentChange('active');
        }}
        style={s.segmentTab}
      >
        {activeCount > 0 ? (
          <PulseDot
            color={activeSegment === 'active' ? customerPalette.primary : customerPalette.onlineGreen}
            size={5}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[s.segmentLabel, activeSegment === 'active' && s.segmentLabelActive]}
        >
          Đang giao
        </Text>
        {activeCount > 0 ? (
          <View style={[s.segmentBadge, activeSegment === 'active' && s.segmentBadgeActive]}>
            <Text style={[s.segmentBadgeText, activeSegment === 'active' && s.segmentBadgeTextActive]}>
              {activeCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityLabel="Lịch sử"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSegment === 'all' }}
        onPress={() => {
          haptic.selection();
          onSegmentChange('all');
        }}
        style={s.segmentTab}
      >
        <Text
          numberOfLines={1}
          style={[s.segmentLabel, activeSegment === 'all' && s.segmentLabelActive]}
        >
          Lịch sử
        </Text>
      </Pressable>
    </View>
  );
}

// ── Search Bar in "Lịch sử" tab ──────────────────────────────────────

function OrdersSearchBar({
  isFocused,
  onBlur,
  onChangeText,
  onClear,
  onFocus,
  value,
}: Readonly<{
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}>) {
  return (
    <Input
      size="md"
      style={[s.searchBar, isFocused && s.searchBarFocused]}
      testID="customer-orders-search-bar"
    >
      <InputSlot style={s.searchIconSlot}>
        <IconSearch
          color={isFocused ? customerPalette.primary : leopardPalette.textMutedSlate}
          size={16}
        />
      </InputSlot>
      <InputField
        accessibilityLabel="Tìm kiếm đơn hàng"
        autoCapitalize="none"
        autoCorrect={false}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder="Tìm theo mã đơn, địa chỉ giao nhận..."
        placeholderTextColor={leopardPalette.textMutedSlate}
        returnKeyType="search"
        style={s.searchInput}
        value={value}
      />
      {value ? (
        <InputSlot style={s.clearBtnSlot}>
          <Pressable
            accessibilityLabel="Xóa tìm kiếm"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              haptic.light();
              onClear();
            }}
            style={({ pressed }) => [s.clearSearchBtn, pressed && s.cardPressed]}
          >
            <Text style={s.clearSearchIcon}>✕</Text>
          </Pressable>
        </InputSlot>
      ) : null}
    </Input>
  );
}

// ── Hero Active Order Card (Apple Inset Grouped) ─────────────────────

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
      onPress={() => {
        haptic.light();
        onPress?.(order.id);
      }}
      style={({ pressed }) => [s.heroCard, pressed && s.cardPressed]}
    >
      {/* Header: Truck Icon + Order Ref + Live Status Pill */}
      <HStack style={s.heroHeaderRow}>
        <HStack style={s.heroHeaderLeft}>
          <Box style={s.heroTruckIconBox}>
            <IconSpeedTruck color={customerPalette.primary} size={16} />
          </Box>
          <VStack style={s.heroRefWrap}>
            <Text style={s.heroRefLabel}>ĐƠN HÀNG</Text>
            <Text style={s.heroRefCode}>{order.reference}</Text>
          </VStack>
        </HStack>

        {/* Dynamic Status Pill */}
        <HStack style={[s.heroStatusPill, { backgroundColor: `${accentColor}18` }]}>
          <PulseDot color={accentColor} size={4} />
          <Text style={[s.heroStatusText, { color: accentColor }]}>{statusLabel}</Text>
        </HStack>
      </HStack>

      <Box style={s.heroDivider} />

      {/* Route Timeline */}
      <VStack style={s.heroRouteTimeline}>
        <HStack style={s.heroRouteItem}>
          <VStack style={s.heroRail}>
            <Box style={s.heroOriginDot} />
            <Box style={s.heroConnectorLine} />
          </VStack>
          <VStack style={s.heroRouteTextWrap}>
            <Text style={s.heroRouteTag}>LẤY HÀNG</Text>
            <Text numberOfLines={1} style={s.heroRouteAddress}>
              {order.route.origin.label}
            </Text>
          </VStack>
        </HStack>

        <HStack style={s.heroRouteItem}>
          <VStack style={s.heroRail}>
            <Box style={s.heroDestDot} />
          </VStack>
          <VStack style={s.heroRouteTextWrap}>
            <Text style={s.heroRouteTag}>GIAO HÀNG</Text>
            <Text numberOfLines={1} style={s.heroRouteAddress}>
              {order.route.destination.label}
            </Text>
          </VStack>
        </HStack>
      </VStack>

      {/* Meta & Price Row */}
      <HStack style={s.heroMetaPriceRow}>
        {order.etaLabel ? (
          <HStack style={s.heroEtaPill}>
            <IconClock color={customerPalette.primary} size={13} />
            <Text style={s.heroEtaText}>ETA dự kiến: {order.etaLabel}</Text>
          </HStack>
        ) : (
          <Box />
        )}
        {order.priceLabel ? (
          <Text style={s.heroPriceText}>{order.priceLabel}</Text>
        ) : null}
      </HStack>

      {/* Primary CTA Button inside card */}
      <Box style={s.heroCtaBtnWrap}>
        <HStack style={s.heroCtaBtn}>
          <IconRoute color={colors.neutral.surface} size={16} />
          <Text style={s.heroCtaBtnText}>Theo dõi chuyến hàng</Text>
          <Text style={s.heroCtaBtnArrow}>→</Text>
        </HStack>
      </Box>
    </Pressable>
  );
});

// ── Completed Order Card (Apple Inset Grouped) ───────────────────────

const CompletedOrderCard = React.memo(function CompletedOrderCard({
  order,
  onPress,
}: Readonly<{
  order: CustomerOrderListItemView;
  onPress?: (orderId: string) => void;
}>) {
  return (
    <Pressable
      accessibilityHint="Xem chi tiết đơn hàng"
      accessibilityLabel={`Đơn ${order.reference}`}
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        onPress?.(order.id);
      }}
      style={({ pressed }) => [s.completedCard, pressed && s.cardPressed]}
    >
      {/* Header: icon + reference + status */}
      <HStack style={s.completedHeader}>
        <Box style={s.completedIconBox}>
          <IconSpeedTruck color={customerPalette.primary} size={18} />
        </Box>
        <VStack style={s.completedTitleWrap}>
          <Text numberOfLines={1} style={s.completedRef}>Đơn {order.reference}</Text>
          <Text numberOfLines={1} style={s.completedUpdated}>{order.updatedAtLabel}</Text>
        </VStack>
        <StatusBadge domain="order" status={order.status} />
      </HStack>

      {/* Route: horizontal compact flow */}
      <HStack style={s.completedRoute}>
        <HStack style={s.completedRouteFlow}>
          <Box style={[s.completedDot, { backgroundColor: colors.success.text }]} />
          <Text numberOfLines={1} style={s.completedRouteText}>{order.route.origin.label}</Text>
        </HStack>
        <HStack style={s.completedArrow}>
          <Box style={s.completedArrowLine} />
          <Text style={s.completedArrowHead}>›</Text>
        </HStack>
        <HStack style={s.completedRouteFlow}>
          <Box style={[s.completedDot, { backgroundColor: colors.danger.text }]} />
          <Text numberOfLines={1} style={s.completedRouteText}>{order.route.destination.label}</Text>
        </HStack>
      </HStack>

      {/* Footer: price + distance + ETA */}
      <HStack style={s.completedFooter}>
        <Text style={s.completedPrice}>{order.priceLabel || '—'}</Text>
        {order.route.distanceLabel ? (
          <Text style={s.completedDistance}>{order.route.distanceLabel}</Text>
        ) : null}
        {order.etaLabel ? (
          <Text style={s.completedEta}>ETA dự kiến: {order.etaLabel}</Text>
        ) : null}
      </HStack>
    </Pressable>
  );
});

// ── Empty Active State ───────────────────────────────────────────────

function EmptyActiveState() {
  return (
    <VStack style={s.emptyActive}>
      <Box style={s.emptyIconOuter}>
        <Box style={s.emptyIconInner}>
          <IconSpeedTruck color={leopardPalette.offlineGray} size={32} />
        </Box>
      </Box>
      <Text style={s.emptyTitle}>Không có chuyến đang giao</Text>
      <Text style={s.emptyBody}>
        Khi bạn đặt chuyến mới, đơn hàng đang vận chuyển sẽ hiện tại đây.
      </Text>
    </VStack>
  );
}

// ── Notice Banner ────────────────────────────────────────────────────

function Notice({ view }: Readonly<{ view: CustomerListContentView }>) {
  if (!view.notice) return null;
  const isError = view.contentState === 'page-error';
  return (
    <Box
      accessibilityLiveRegion="polite"
      style={[s.notice, isError ? s.noticeError : s.noticeWarning]}
    >
      <Text accessibilityRole={isError ? 'alert' : undefined} style={s.noticeText}>
        {view.notice}
      </Text>
    </Box>
  );
}

// ── Loading Skeleton (Apple style) ───────────────────────────────────

function OrdersSkeleton() {
  return (
    <View style={s.skeletonWrap}>
      {/* Fake segmented control */}
      <SkeletonBar borderRadius={radius.pill} height={38} />
      {/* Fake cards */}
      <SkeletonCard>
        <SkeletonBar borderRadius={radius.cardSm} height={48} width="100%" />
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
  isRefreshing,
  onClearFilters,
  onCreate,
  onLoadMore,
  onOpenOrder,
  onRefresh,
  onRetry,
  onSelectStatus,
  view,
}: CustomerOrdersScreenProps) {
  const [segment, setSegment] = useState<OrdersSegment>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setLocalRefreshing(true);
      haptic.light();
      try {
        await onRefresh();
      } finally {
        setLocalRefreshing(false);
      }
    } else if (onRetry) {
      setLocalRefreshing(true);
      haptic.light();
      try {
        onRetry();
      } finally {
        setLocalRefreshing(false);
      }
    }
  }, [onRefresh, onRetry]);

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

  // Search filter on completed orders — no server round-trip
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return completedOrders;
    const q = searchQuery.trim().toLowerCase();
    return completedOrders.filter((o) => {
      const matchRef = o.reference?.toLowerCase().includes(q);
      const matchOrigin = o.route?.origin?.label?.toLowerCase().includes(q);
      const matchDest = o.route?.destination?.label?.toLowerCase().includes(q);
      const matchStatus = o.status?.toLowerCase().includes(q);
      const matchPrice = o.priceLabel?.toLowerCase().includes(q);
      const matchEta = o.etaLabel?.toLowerCase().includes(q);
      return Boolean(matchRef || matchOrigin || matchDest || matchStatus || matchPrice || matchEta);
    });
  }, [completedOrders, searchQuery]);

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
            onPress={() => {
              haptic.light();
              onCreate();
            }}
            style={({ pressed }) => [s.floatingCta, pressed && s.cardPressed]}
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
        ListEmptyComponent={
          segment === 'active' ? (
            <EmptyActiveState />
          ) : searchQuery.trim() ? (
            <View style={s.emptySearchState}>
              <IconSearch color={colors.neutral.subtleText} size={28} />
              <Text style={s.emptySearchTitle}>Không tìm thấy đơn hàng</Text>
              <Text style={s.emptySearchBody}>
                Không có đơn nào khớp với từ khóa "{searchQuery}".
              </Text>
            </View>
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
        ListHeaderComponent={
          <View style={s.headerContent}>
            {/* Apple Inset Pill Segmented Control */}
            <AppleSegmentedControl
              activeCount={activeOrders.length}
              activeSegment={segment}
              onSegmentChange={setSegment}
            />

            {/* Search bar in "Lịch sử" tab */}
            {segment === 'all' ? (
              <>
                <OrdersSearchBar
                  isFocused={isSearchFocused}
                  onBlur={() => setIsSearchFocused(false)}
                  onChangeText={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  onFocus={() => setIsSearchFocused(true)}
                  value={searchQuery}
                />
                <Notice view={view} />
              </>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            colors={[customerPalette.primary]}
            onRefresh={handleRefresh}
            refreshing={isRefreshing ?? localRefreshing}
            tintColor={customerPalette.primary}
          />
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

  // ─── Apple Inset Pill Segmented Control ─────────────────────────
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    padding: spacing.hairline + 1,
    height: 42,
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
  },
  segmentedPillIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    boxShadow: '0 2px 6px rgba(11, 37, 69, 0.12)',
    elevation: 2,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: '100%',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    zIndex: 1,
  },
  segmentLabel: {
    ...typeScale.subheadline,
    color: colors.neutral.subtleText,
    fontWeight: '500',
  },
  segmentLabelActive: {
    fontWeight: '600',
    color: customerPalette.primary,
  },
  segmentBadge: {
    backgroundColor: customerPalette.onlineGreen,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    paddingHorizontal: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeActive: {
    backgroundColor: customerPalette.primary,
  },
  segmentBadgeText: {
    color: colors.neutral.surface,
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  segmentBadgeTextActive: {
    color: '#FFFFFF',
  },

  // ─── Search Bar ───────────────────────────────────────────────
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : spacing.xxs,
    minHeight: 40,
  },
  searchBarFocused: {
    borderColor: customerPalette.primary,
    borderWidth: 1,
  },
  searchIconSlot: {
    paddingLeft: spacing.xxs,
    paddingRight: spacing.xxs,
  },
  clearBtnSlot: {
    paddingRight: spacing.xxs,
  },
  searchInput: {
    color: colors.neutral.text,
    flex: 1,
    ...typeScale.subheadline,
    padding: 0,
  },
  clearSearchBtn: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  clearSearchIcon: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
    fontWeight: '600',
  },

  // ─── Empty Search State ───────────────────────────────────────
  emptySearchState: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  emptySearchTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  emptySearchBody: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    textAlign: 'center',
  },

  // ─── Hero Active Order Card (Apple Inset Grouped) ───────────────────
  heroCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    boxShadow: '0 3px 12px rgba(11, 37, 69, 0.05)',
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  heroHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroTruckIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRefWrap: {
    gap: 1,
  },
  heroRefLabel: {
    ...typeScale.caption2,
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.subtleText,
    letterSpacing: 0.5,
  },
  heroRefCode: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: colors.neutral.text,
    fontVariant: ['tabular-nums'],
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  heroStatusText: {
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral.border,
    marginVertical: spacing.xxs,
  },

  // Route Timeline
  heroRouteTimeline: {
    gap: 0,
    paddingVertical: spacing.xxs,
  },
  heroRouteItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  heroRail: {
    alignItems: 'center',
    width: 14,
    paddingTop: 3,
  },
  heroOriginDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.success.text,
  },
  heroConnectorLine: {
    width: 1.5,
    flex: 1,
    minHeight: 14,
    backgroundColor: colors.neutral.border,
    marginVertical: 2,
  },
  heroDestDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.accent,
  },
  heroRouteTextWrap: {
    flex: 1,
    paddingBottom: spacing.xs,
    gap: 1,
  },
  heroRouteTag: {
    ...typeScale.caption2,
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.subtleText,
    letterSpacing: 0.4,
  },
  heroRouteAddress: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: colors.neutral.text,
    lineHeight: 18,
  },

  // Meta & Price Row
  heroMetaPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingTop: spacing.xxs,
  },
  heroEtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.neutral.canvas,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline + 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
  },
  heroEtaText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  heroPriceText: {
    ...typeScale.title3,
    fontWeight: '800',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },

  // Primary CTA Button inside card
  heroCtaBtnWrap: {
    marginTop: spacing.xxs,
  },
  heroCtaBtn: {
    height: 44,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    boxShadow: '0 2px 6px rgba(11, 37, 69, 0.2)',
  },
  heroCtaBtnText: {
    color: colors.neutral.surface,
    ...typeScale.footnote,
    fontWeight: '700',
  },
  heroCtaBtnArrow: {
    color: 'rgba(255, 255, 255, 0.7)',
    ...typeScale.callout,
    fontWeight: '700',
  },

  // ─── Completed Order Card (Inset Grouped) ─────────────────────
  completedCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
    elevation: 1,
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
    fontWeight: '600',
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
    color: colors.neutral.subtleText,
  },
  completedEta: {
    ...typeScale.caption2,
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
    color: colors.neutral.text,
    textAlign: 'center',
  },
  emptyBody: {
    ...typeScale.subheadline,
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeError: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    ...typeScale.footnote,
    color: colors.neutral.text,
    lineHeight: 18,
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
    elevation: 4,
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

  // ─── Emil Kowalski Active State ───────────────────────────────
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
});
