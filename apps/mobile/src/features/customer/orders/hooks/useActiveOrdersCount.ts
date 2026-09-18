import { useQuery } from '@tanstack/react-query';
import { customerQueryKeys } from '@leopard/mobile-core';
import type { OrderStatus } from '@leopard/shared';

import { createCustomerHttpAdapter } from '../adapter';

export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'RETURNING',
];

export function useActiveOrdersCount(enabled = true): number {
  const query = useQuery({
    queryKey: customerQueryKeys.orderList('ALL'),
    queryFn: () => createCustomerHttpAdapter().getOrdersView('ALL'),
    enabled,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  if (!query.data || query.data.kind !== 'content') {
    return 0;
  }

  return query.data.orders.filter((order) =>
    (ACTIVE_ORDER_STATUSES as readonly string[]).includes(order.status),
  ).length;
}
