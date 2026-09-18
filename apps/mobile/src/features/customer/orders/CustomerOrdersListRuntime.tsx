import { useMemo } from 'react';
import { createSocketFactory, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';
import { CustomerOrdersScreen } from './CustomerOrdersScreen';
import { createCustomerTrackingSocket } from './tracking-socket';
import { useCustomerOrdersList } from './hooks/useCustomerOrdersList';

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
  const socketManager = useMemo(
    () => createCustomerTrackingSocket({ socketFactory: createSocketFactory }),
    [],
  );

  const { filter, setFilter, query } = useCustomerOrdersList({
    focusKey,
    port,
    socketManager,
  });

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
