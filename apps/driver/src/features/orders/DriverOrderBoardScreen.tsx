import React, { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  colors,
  iconSize,
  IconShieldAlert,
  ScreenScaffold,
  ScreenState,
  SkeletonCard,
  spacing,
} from '@leopard/mobile-core';

import type { DriverListView } from './model';

import { DriverEmptyBoard } from './components/DriverEmptyBoard';
import { DriverNearbyOrderCard } from './components/DriverNearbyOrderCard';
import { DriverOrderFilters } from './components/DriverOrderFilters';

export type DriverOrderBoardScreenProps = Readonly<{
  view: DriverListView;
  onOpenOrder?: (orderId: string) => void;
  onRetry?: () => void;
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}>;

/**
 * The "Đơn" tab: a single-purpose load board to browse and accept available
 * orders. Home owns availability/map/active-trip and the incoming-offer
 * push modal; this screen owns nothing but the list of orders a driver can
 * choose from — so it has no debug "simulate offer" trigger of its own.
 */
export function DriverOrderBoardScreen({
  onBack,
  onNavigate,
  onOpenOrder,
  onRetry,
  view,
}: DriverOrderBoardScreenProps) {
  const [dismissedOrderIds, setDismissedOrderIds] = useState<readonly string[]>([]);

  const isContent = view.kind === 'content';
  const activeTrip = isContent ? view.activeTrip : null;

  const filteredOrders = useMemo(() => {
    if (view.kind !== 'content') return [];
    if (dismissedOrderIds.length === 0) return view.requestedOrders;
    const dismissedSet = new Set(dismissedOrderIds);
    return view.requestedOrders.filter((item) => !dismissedSet.has(item.id));
  }, [view, dismissedOrderIds]);

  const handleDecline = useCallback((orderId: string) => {
    setDismissedOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    onNavigate?.('/orders');
  }, [onBack, onNavigate]);

  // ponytail: Flat list rendering handles load board feed; upgrade to FlashList when concurrent available orders exceed 50.
  return (
    <ScreenScaffold headerTone="plain" onBack={handleBack} title="Đơn">
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
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
                onGoHome={handleBack}
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
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
