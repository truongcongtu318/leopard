import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverHttpAdapter } from './adapter';
import { DriverOrderBoardScreen } from './DriverOrderBoardScreen';

export type DriverOrderBoardRuntimeProps = Readonly<{
  onOpenOrder: (orderId: string) => void;
  onNavigate?: (route: string) => void;
}>;

/**
 * Data wiring for the "Đơn" tab. Shares the `['driver', 'orders']` query key
 * with `DriverOrdersListRuntime` (Home) so both screens read the same
 * React Query cache instead of double-fetching.
 */
export function DriverOrderBoardRuntime({ onNavigate, onOpenOrder }: DriverOrderBoardRuntimeProps) {
  const port = useMemo(() => createDriverHttpAdapter(), []);

  const query = useQuery({
    queryKey: ['driver', 'orders'],
    queryFn: () => port.getOrdersView(),
  });

  if (query.isPending) {
    return (
      <DriverOrderBoardScreen
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => void query.refetch()}
        view={{
          kind: 'loading',
          message: '',
          scenarioId: 'D-LIST-LOADING',
          title: '',
        }}
      />
    );
  }

  if (query.isError && !query.data) {
    return (
      <DriverOrderBoardScreen
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => void query.refetch()}
        view={{
          kind: 'error',
          message: query.error?.message || 'Đã có lỗi xảy ra trong quá trình tải dữ liệu.',
          scenarioId: 'D-LIST-ERROR',
          title: 'Không thể tải danh sách đơn',
        }}
      />
    );
  }

  if (!query.data) {
    return null;
  }

  return (
    <DriverOrderBoardScreen
      onNavigate={onNavigate}
      onOpenOrder={onOpenOrder}
      onRetry={() => void query.refetch()}
      view={query.data}
    />
  );
}
