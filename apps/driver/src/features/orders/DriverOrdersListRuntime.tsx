import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { createDriverProfileHttpAdapter } from '../profile/adapter';
import { createDriverHttpAdapter } from './adapter';
import { DriverOrdersScreen } from './DriverOrdersScreen';
import { useDispatchOffer } from './useDispatchOffer';

export type DriverOrdersListRuntimeProps = Readonly<{
  onOpenOrder: (orderId: string) => void;
  onNavigate?: (route: string) => void;
}>;

export function DriverOrdersListRuntime({ onNavigate, onOpenOrder }: DriverOrdersListRuntimeProps) {
  const port = useMemo(() => createDriverHttpAdapter(), []);
  const profilePort = useMemo(() => createDriverProfileHttpAdapter(), []);
  const queryClient = useQueryClient();
  const queryKey = ['driver', 'orders'];

  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrdersView(),
  });

  const profileQuery = useQuery({
    queryKey: ['driver', 'profile'],
    queryFn: () => profilePort.getProfileView(),
    staleTime: 5 * 60 * 1000,
  });

  const driverIdentity = useMemo(() => {
    if (profileQuery.data && profileQuery.data.kind === 'content') {
      return {
        name: profileQuery.data.name ?? null,
        vehicleLabel: profileQuery.data.vehicleLabel ?? null,
      };
    }
    return undefined;
  }, [profileQuery.data]);

  const { offer, declineOffer } = useDispatchOffer();

  if (query.isPending) {
    return (
      <DriverOrdersScreen
        driverIdentity={driverIdentity}
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => {
          void query.refetch();
          void profileQuery.refetch();
        }}
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
        driverIdentity={driverIdentity}
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => {
          void query.refetch();
          void profileQuery.refetch();
        }}
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
      driverIdentity={driverIdentity}
      incomingOffer={offer}
      networkError={query.isError ? (query.error?.message ?? 'Lỗi kết nối máy chủ') : null}
      onAcceptIncomingOffer={(orderId) => void handleAcceptOffer(orderId)}
      onDeclineIncomingOffer={() => declineOffer()}
      onNavigate={onNavigate}
      onOpenOrder={onOpenOrder}
      onRetry={() => {
        void query.refetch();
        void profileQuery.refetch();
      }}
      onSetAvailability={(commandId) => void handleSetAvailability(commandId)}
      view={query.data}
    />
  );
}
