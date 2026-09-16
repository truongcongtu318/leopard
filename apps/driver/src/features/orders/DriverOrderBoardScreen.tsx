import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import {
  AppText,
  colors,
  iconSize,
  IconShieldAlert,
  layout,
  ScreenState,
  SkeletonCard,
  spacing,
} from '@leopard/mobile-core';

import type { DriverListView } from './model';

import { DriverBottomNavigation } from './components/DriverBottomNavigation';
import { DriverEmptyBoard } from './components/DriverEmptyBoard';
import { DriverNearbyOrderCard } from './components/DriverNearbyOrderCard';
import { DriverOrderFilters } from './components/DriverOrderFilters';

export type DriverOrderBoardScreenProps = Readonly<{
  view: DriverListView;
  onOpenOrder?: (orderId: string) => void;
  onRetry?: () => void;
  onNavigate?: (route: string) => void;
}>;

/**
 * Scroll distance, in points, over which the large title hands over to the
 * inline navigation-bar title. Apple collapses a large title as it scrolls
 * under the bar; matching that keeps the screen anchored instead of letting the
 * only "where am I" cue scroll away.
 */
const TITLE_COLLAPSE_DISTANCE = 44;

/**
 * The "Đơn" tab: a single-purpose load board to browse and accept available
 * orders. Home owns availability/map/active-trip and the incoming-offer
 * push modal; this screen owns nothing but the list of orders a driver can
 * choose from — so it has no debug "simulate offer" trigger of its own.
 */
export function DriverOrderBoardScreen({
  onNavigate,
  onOpenOrder,
  onRetry,
  view,
}: DriverOrderBoardScreenProps) {
  const [dismissedOrderIds, setDismissedOrderIds] = useState<readonly string[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    }),
  ).current;

  const isContent = view.kind === 'content';
  const activeTrip = isContent ? view.activeTrip : null;

  const filteredOrders = isContent
    ? view.requestedOrders.filter((item) => !dismissedOrderIds.includes(item.id))
    : [];

  const handleDecline = useCallback((orderId: string) => {
    setDismissedOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
  }, []);

  const barTitleOpacity = scrollY.interpolate({
    inputRange: [TITLE_COLLAPSE_DISTANCE - 16, TITLE_COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const barBorderOpacity = scrollY.interpolate({
    inputRange: [0, TITLE_COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.screenRoot}>
      {/*
        Sticky navigation bar. The large title below scrolls; this bar stays and
        fades in the inline title plus a hairline separator, so the screen keeps
        a title at every scroll offset. The inline copy is hidden from assistive
        tech — the large title already announces the screen once.
      */}
      <View style={styles.navBar} testID="driver-board-nav-bar">
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.navBarTitle, { opacity: barTitleOpacity }]}
        >
          <AppText numberOfLines={1} style={styles.navBarTitleText} variant="headline">
            Đơn
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.navBarBorder, { opacity: barBorderOpacity }]} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <AppText accessibilityRole="header" style={styles.pageTitle} variant="largeTitle">
          Đơn
        </AppText>

        {view.kind === 'loading' ? (
          <View style={styles.sectionGap}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : null}

        {view.kind === 'permission-denied' || view.kind === 'error' ? (
          <View style={styles.boundaryBox}>
            <ScreenState
              actionLabel={view.kind === 'error' ? 'Thử tải lại danh sách' : undefined}
              icon={<IconShieldAlert color={colors.danger.text} size={iconSize.lg} />}
              message={view.message}
              onAction={onRetry}
              state={view.kind}
              title={view.title}
            />
          </View>
        ) : null}

        {isContent ? (
          <>
            <DriverOrderFilters
              hasActiveTrip={Boolean(activeTrip)}
              totalCount={filteredOrders.length}
            />

            {filteredOrders.length > 0 ? (
              <View style={styles.ordersFeed}>
                {filteredOrders.map((item) => (
                  <DriverNearbyOrderCard
                    item={item}
                    key={item.id}
                    onDecline={handleDecline}
                    onOpenOrder={onOpenOrder}
                  />
                ))}
              </View>
            ) : (
              <DriverEmptyBoard
                isOnline={
                  view.availability.status === 'AVAILABLE' ||
                  (view.availability.status as string) === 'ONLINE'
                }
              />
            )}
          </>
        ) : null}
      </Animated.ScrollView>

      <DriverBottomNavigation activeTab="board" onNavigate={onNavigate} />
    </View>
  );
}

const NAV_BAR_HEIGHT = 44;

const styles = StyleSheet.create({
  screenRoot: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  navBar: {
    alignItems: 'center',
    height: NAV_BAR_HEIGHT,
    justifyContent: 'center',
    zIndex: 1,
  },
  navBarTitle: {
    maxWidth: '70%',
  },
  navBarTitleText: {
    color: colors.neutral.titleText,
    textAlign: 'center',
  },
  navBarBorder: {
    backgroundColor: colors.neutral.border,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  content: {
    alignSelf: 'center',
    maxWidth: layout.contentMaxWidth,
    paddingBottom: layout.bottomNavClearance,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  pageTitle: {
    color: colors.neutral.titleText,
    marginBottom: spacing.sm,
  },
  sectionGap: {
    gap: spacing.sm,
  },
  boundaryBox: {
    paddingVertical: spacing.sm,
  },
  ordersFeed: {
    gap: spacing.sm,
  },
});
