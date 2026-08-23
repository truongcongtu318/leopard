import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { createCustomerHttpAdapter } from './adapter';
import { CustomerOrdersScreen } from './CustomerOrdersScreen';
import type { CustomerOrderFilter } from './model';

export type CustomerOrdersListRuntimeProps = Readonly<{
  onCreate: () => void;
  onOpenOrder: (orderId: string) => void;
}>;

export function CustomerOrdersListRuntime({ onCreate, onOpenOrder }: CustomerOrdersListRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const [filter, setFilter] = useState<CustomerOrderFilter>('ALL');

  const query = useQuery({
    queryKey: ['customer', 'orders', filter],
    queryFn: () => port.getOrdersView(filter),
  });

  if (query.isPending) {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Đơn hàng của tôi">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Đơn hàng của tôi">
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
