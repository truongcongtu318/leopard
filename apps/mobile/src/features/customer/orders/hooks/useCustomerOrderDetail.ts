import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customerQueryKeys } from '@leopard/mobile-core';
import type { CustomerOrdersPort } from '../port';
import type {
  CustomerTrackingSocketManager,
  CustomerTrackingPointUpdate,
  CustomerStatusUpdate,
} from '../tracking-socket';
import { mapTrackingStateToView } from '../tracking-socket';
import type { CustomerTrackingView } from '../model';

function isTrackingEligibleStatus(status: string | null): boolean {
  return (
    status === 'ACCEPTED' ||
    status === 'PICKING_UP' ||
    status === 'IN_TRANSIT' ||
    status === 'RETURNING'
  );
}

interface UseCustomerOrderDetailParams {
  orderId: string;
  port: CustomerOrdersPort;
  socketManager: CustomerTrackingSocketManager;
}

export function useCustomerOrderDetail({
  orderId,
  port,
  socketManager,
}: UseCustomerOrderDetailParams) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => customerQueryKeys.orderDetail(orderId), [orderId]);

  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrderDetailView(orderId),
    refetchInterval: (queryState) => {
      const data = queryState.state.data;
      if (data && data.kind === 'content') {
        const payment = data.order.payment;
        if (payment.status === 'QR_CREATED' && payment.qrState === 'ready') {
          return 4000;
        }
      }
      return false;
    },
  });

  const [liveTracking, setLiveTracking] = useState<CustomerTrackingView | null>(null);
  const status = query.data && query.data.kind === 'content' ? query.data.order.status : null;
  const isEligible = isTrackingEligibleStatus(status);

  const refetchRef = useRef(query.refetch);
  useEffect(() => {
    refetchRef.current = query.refetch;
  }, [query.refetch]);

  useEffect(() => {
    if (!isEligible) return undefined;

    const unsubscribe = socketManager.subscribe({
      onPointUpdated: (update: CustomerTrackingPointUpdate) => {
        if (update.orderId !== orderId) return;
        setLiveTracking(update.trackingView);
      },
      onConnectionStateChanged: () => {
        setLiveTracking(
          mapTrackingStateToView({
            connectionState: socketManager.getConnectionState(),
            hasDriver: true,
            latestPoint: socketManager.getLatestPoint(orderId),
          }),
        );
      },
      onStatusUpdated: (update: CustomerStatusUpdate) => {
        if (update.orderId !== orderId) return;
        setLiveTracking((current: CustomerTrackingView | null) => {
          const latestPoint = socketManager.getLatestPoint(orderId);
          if (!latestPoint) return current;
          return mapTrackingStateToView({
            connectionState: socketManager.getConnectionState(),
            hasDriver: true,
            latestPoint,
          });
        });
        void refetchRef.current();
      },
    });

    socketManager.joinOrder(orderId);
    void socketManager.connect();

    return () => {
      unsubscribe();
      socketManager.leaveOrder(orderId);
      socketManager.disconnect();
    };
  }, [socketManager, orderId, isEligible]);

  useEffect(() => {
    return () => socketManager.destroy();
  }, [socketManager]);

  return {
    router,
    queryClient,
    queryKey,
    query,
    liveTracking,
  };
}
