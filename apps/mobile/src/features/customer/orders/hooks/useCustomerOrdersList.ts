import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customerQueryKeys } from '@leopard/mobile-core';
import type { CustomerOrderFilter, CustomerOrderListItemView } from '../model';
import type { CustomerOrdersPort } from '../port';
import type { CustomerTrackingSocketManager } from '../tracking-socket';

const LIVE_STATUSES: readonly string[] = [
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'RETURNING',
];

interface UseCustomerOrdersListParams {
  focusKey?: number;
  port: CustomerOrdersPort;
  socketManager: CustomerTrackingSocketManager;
}

export function useCustomerOrdersList({
  focusKey,
  port,
  socketManager,
}: UseCustomerOrdersListParams) {
  const [filter, setFilter] = useState<CustomerOrderFilter>('ALL');

  const query = useQuery({
    queryKey: customerQueryKeys.orderList(filter),
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
      .filter((order: CustomerOrderListItemView) => LIVE_STATUSES.includes(order.status))
      .map((order: CustomerOrderListItemView) => order.id);
  }, [view]);

  const refetchRef = useRef(query.refetch);
  useEffect(() => {
    refetchRef.current = query.refetch;
  }, [query.refetch]);

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

  return {
    filter,
    setFilter,
    query,
  };
}
