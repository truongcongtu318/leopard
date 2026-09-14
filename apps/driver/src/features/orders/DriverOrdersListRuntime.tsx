import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert } from 'react-native';

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

  // If query errored out and there is NO cached data, show error state
  if (query.isError && !query.data) {
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

  if (!query.data) {
    return null;
  }

  async function handleSetAvailability(commandId: string) {
    await port.setAvailability(commandId);
    void queryClient.invalidateQueries({ queryKey });
  }

  async function handleAcceptOffer(orderId: string) {
    declineOffer();
    const result = await port.acceptOrder(orderId);
    void queryClient.invalidateQueries({ queryKey });
    if (result.kind === 'content') {
      onOpenOrder(orderId);
    } else if (result.kind === 'conflict') {
      Alert.alert(result.title, result.message);
    }
  }

  return (
    <DriverOrdersScreen
      incomingOffer={offer}
      networkError={query.isError ? (query.error?.message ?? 'Lỗi kết nối máy chủ') : null}
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
