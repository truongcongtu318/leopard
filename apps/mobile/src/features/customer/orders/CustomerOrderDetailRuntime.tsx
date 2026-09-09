import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { createSocketFactory } from '../../../api/socket-client';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';
import { createCustomerMediaPickerAdapter } from './media-picker-adapter';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import type { CustomerDetailView, CustomerOrderIntent, CustomerTrackingView } from './model';
import { createCustomerTrackingSocket, mapTrackingStateToView } from './tracking-socket';

export type CustomerOrderDetailRuntimeProps = Readonly<{
  orderId: string;
}>;

function isTrackingEligibleStatus(status: string | null): boolean {
  return status === 'PICKING_UP' || status === 'IN_TRANSIT';
}

export function CustomerOrderDetailRuntime({ orderId }: CustomerOrderDetailRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const mediaPort = useMemo(() => createCustomerMediaPickerAdapter(), []);
  const socketManager = useMemo(
    () => createCustomerTrackingSocket({ socketFactory: createSocketFactory }),
    [],
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ['customer', 'order', orderId];

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

  useEffect(() => {
    if (!isTrackingEligibleStatus(status)) return undefined;

    setLiveTracking(null);
    socketManager.joinOrder(orderId);
    void socketManager.connect();

    const unsubscribe = socketManager.subscribe({
      onPointUpdated: (update) => {
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
      onStatusUpdated: (update) => {
        if (update.orderId !== orderId) return;
        void query.refetch();
      },
    });

    return () => {
      unsubscribe();
      socketManager.leaveOrder(orderId);
    };
  }, [socketManager, orderId, status]);

  useEffect(() => {
    return () => socketManager.destroy();
  }, [socketManager]);

  if (query.isPending) {
    return (
      <ScreenScaffold title="Chi tiết đơn">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenScaffold title="Chi tiết đơn">
        <ScreenState actionLabel="Thử lại" onAction={() => query.refetch()} state="error" />
      </ScreenScaffold>
    );
  }

  const view: CustomerDetailView =
    query.data.kind === 'content' && liveTracking
      ? { ...query.data, order: { ...query.data.order, tracking: liveTracking } }
      : query.data;

  async function runIntent(intent: CustomerOrderIntent) {
    const next = await port.executeIntent(intent);
    queryClient.setQueryData(queryKey, next);
  }

  function handleOpenInvoice(invoiceId: string) {
    router.push({ pathname: '/customer/invoice-preview', params: { invoiceId } });
  }

  async function handleSendInvoiceEmail(invoiceId: string, email: string) {
    if (!port.sendInvoiceEmail) return;
    const next = await port.sendInvoiceEmail(invoiceId, orderId, email);
    queryClient.setQueryData(queryKey, next);
  }

  async function handlePickCargoImage() {
    const picked = await mediaPort.pickCargoImage();
    if (!picked) return;
    const media = await mediaPort.uploadCargoImage(orderId);
    queryClient.setQueryData(queryKey, (current: typeof query.data) => {
      if (!current || current.kind !== 'content') return current;
      return { ...current, order: { ...current.order, media } };
    });
  }

  return (
    <CustomerOrderDetailScreen
      onBack={() => router.back()}
      onCancel={(actionId) => void runIntent({ actionId, orderId })}
      onOpenTracking={(id) =>
        router.push({ pathname: '/customer/tracking', params: { orderId: id } })
      }
      onPaymentAction={(actionId) => void runIntent({ actionId, orderId })}
      onPickCargoImage={() => void handlePickCargoImage()}
      onPrimaryAction={(actionId) => void runIntent({ actionId, orderId })}
      onOpenInvoice={(invoiceId) => handleOpenInvoice(invoiceId)}
      onSendInvoiceEmail={(invoiceId, email) => void handleSendInvoiceEmail(invoiceId, email)}
      onRetry={() => query.refetch()}
      view={view}
    />
  );
}
