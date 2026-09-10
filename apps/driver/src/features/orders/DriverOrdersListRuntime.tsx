import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverHttpAdapter } from './adapter';
import { DriverOrdersScreen } from './DriverOrdersScreen';
import { useDispatchOffer } from './useDispatchOffer';

export type DriverOrdersListRuntimeProps = Readonly<{
  onOpenOrder: (orderId: string) => void;
  onNavigate?: (route: string) => void;
}>;

export function DriverOrdersListRuntime({ onNavigate, onOpenOrder }: DriverOrdersListRuntimeProps) {
  const port = useMemo(() => createDriverHttpAdapter(), []);
  const queryClient = useQueryClient();
  const queryKey = ['driver', 'orders'];

  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrdersView(),
  });

  const { offer, declineOffer } = useDispatchOffer();

  if (query.isPending) {
    return (
      <DriverOrdersScreen
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => query.refetch()}
        view={{
          kind: 'loading',
          message: '',
          scenarioId: 'D-LIST-LOADING',
          title: '',
        }}
      />
    );
  }

  if (query.isError || !query.data) {
    return (
      <DriverOrdersScreen
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => query.refetch()}
        view={{
          kind: 'error',
          message: query.error?.message || 'Đã có lỗi xảy ra trong quá trình tải dữ liệu.',
          scenarioId: 'D-LIST-ERROR',
          title: 'Không thể tải danh sách đơn',
        }}
      />
    );
  }

  async function handleSetAvailability(commandId: string) {
    await port.setAvailability(commandId);
    void queryClient.invalidateQueries({ queryKey });
  }

  async function handleAcceptOffer(orderId: string) {
    declineOffer();
    await port.acceptOrder(orderId);
    void queryClient.invalidateQueries({ queryKey });
  }

  return (
    <DriverOrdersScreen
      incomingOffer={offer}
      onAcceptIncomingOffer={(orderId) => void handleAcceptOffer(orderId)}
      onDeclineIncomingOffer={() => declineOffer()}
      onNavigate={onNavigate}
      onOpenOrder={onOpenOrder}
      onRetry={() => query.refetch()}
      onSetAvailability={(commandId) => void handleSetAvailability(commandId)}
      view={query.data}
    />
  );
}
