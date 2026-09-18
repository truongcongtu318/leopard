import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { createSocketFactory } from '@leopard/mobile-core';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';
import { CustomerOrdersScreen } from './CustomerOrdersScreen';
import { createCustomerTrackingSocket } from './tracking-socket';
import type { CustomerOrderFilter } from './model';

export type CustomerOrdersListRuntimeProps = Readonly<{
  onCreate: () => void;
  onOpenOrder: (orderId: string) => void;
  focusKey?: number;
}>;

/** Statuses a driver can still move, i.e. the cards worth watching live. */
const LIVE_STATUSES: readonly string[] = [
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'RETURNING',
];

export function CustomerOrdersListRuntime({
  focusKey,
  onCreate,
  onOpenOrder,
}: CustomerOrdersListRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const socketManager = useMemo(
    () => createCustomerTrackingSocket({ socketFactory: createSocketFactory }),
    [],
  );
  const [filter, setFilter] = useState<CustomerOrderFilter>('ALL');

  const query = useQuery({
    queryKey: ['customer', 'orders', filter],
    queryFn: () => port.getOrdersView(filter),
  });

  const prevFocusKeyRef = useRef(focusKey);
  useEffect(() => {
    if (
      prevFocusKeyRef.current !== undefined &&
      focusKey !== undefined &&
      focusKey > prevFocusKeyRef.current
    ) {
      void query.refetch();
    }
    prevFocusKeyRef.current = focusKey;
  }, [focusKey, query]);

  const view = query.data;
  const liveOrderIds = useMemo(() => {
    if (!view || view.kind !== 'content') return [];
    return view.orders
      .filter((order) => LIVE_STATUSES.includes(order.status))
      .map((order) => order.id);
  }, [view]);

  const refetchRef = useRef(query.refetch);
  useEffect(() => {
    refetchRef.current = query.refetch;
  }, [query.refetch]);

  // A driver tapping the next mission step must flip the matching card here,
  // without the customer pulling to refresh.
  //
  // `liveOrderIds` is a fresh array each render, so the effect keys off the
  // joined ids and re-derives the list inside — otherwise it would re-subscribe
  // (and drop the socket) on every render.
  const liveOrderKey = liveOrderIds.join(',');
  useEffect(() => {
    if (!liveOrderKey) return undefined;
    const orderIds = liveOrderKey.split(',');

    const unsubscribe = socketManager.subscribe({
      onStatusUpdated: () => {
        void refetchRef.current();
      },
    });

    socketManager.joinOrders(orderIds);
    void socketManager.connect();

    return () => {
      unsubscribe();
      socketManager.leaveOrder();
      socketManager.disconnect();
    };
  }, [socketManager, liveOrderKey]);

  useEffect(() => {
    return () => socketManager.destroy();
  }, [socketManager]);

  if (query.isPending) {
    return (
      <ScreenScaffold title="Đơn hàng của tôi">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenScaffold title="Đơn hàng của tôi">
        <ScreenState
          actionLabel="Thử lại"
          onAction={() => query.refetch()}
          state="error"
        />
      </ScreenScaffold>
    );
  }

  return (
    <CustomerOrdersScreen
      onClearFilters={() => setFilter('ALL')}
      onCreate={onCreate}
      onLoadMore={undefined}
      onOpenOrder={onOpenOrder}
      onRetry={() => query.refetch()}
      onSelectStatus={setFilter}
      view={query.data}
    />
  );
}
