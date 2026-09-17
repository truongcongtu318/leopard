import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';
import { CustomerOrdersScreen } from './CustomerOrdersScreen';
import type { CustomerOrderFilter } from './model';

export type CustomerOrdersListRuntimeProps = Readonly<{
  onCreate: () => void;
  onOpenOrder: (orderId: string) => void;
  focusKey?: number;
}>;

export function CustomerOrdersListRuntime({
  focusKey,
  onCreate,
  onOpenOrder,
}: CustomerOrdersListRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
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
