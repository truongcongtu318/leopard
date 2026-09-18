import { useMemo } from 'react';
import { createSocketFactory, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';
import { createCustomerMediaPickerAdapter } from './media-picker-adapter';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import type { CustomerDetailView, CustomerOrderIntent } from './model';
import { createCustomerTrackingSocket } from './tracking-socket';
import { useCustomerOrderDetail } from './hooks/useCustomerOrderDetail';

export type CustomerOrderDetailRuntimeProps = Readonly<{
  orderId: string;
}>;

export function CustomerOrderDetailRuntime({ orderId }: CustomerOrderDetailRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const mediaPort = useMemo(() => createCustomerMediaPickerAdapter(), []);
  const socketManager = useMemo(
    () => createCustomerTrackingSocket({ socketFactory: createSocketFactory }),
    [],
  );

  const {
    router,
    queryClient,
    queryKey,
    query,
    liveTracking,
  } = useCustomerOrderDetail({ orderId, port, socketManager });

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
      onCancel={(actionId, reason) => void runIntent({ actionId, orderId, value: reason })}
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
