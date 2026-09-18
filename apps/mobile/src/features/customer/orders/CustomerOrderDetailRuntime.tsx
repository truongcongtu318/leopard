import { useEffect, useMemo } from 'react';
import { createSocketFactory, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';
import { createCustomerMediaPickerAdapter } from './media-picker-adapter';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import type { CustomerDetailView, CustomerOrderIntent } from './model';
import { createCustomerTrackingSocket } from './tracking-socket';
import { useCustomerOrderDetail } from './hooks/useCustomerOrderDetail';

const ACTIVE_TRACKING_STATUSES = [
  'ACCEPTED',
  'PICKING_UP',
  'PICKED_UP',
  'IN_TRANSIT',
  'RETURNING',
] as const;

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

  useEffect(() => {
    if (query.data?.kind === 'content') {
      const order = query.data.order;
      if (
        (ACTIVE_TRACKING_STATUSES as readonly string[]).includes(order.status) &&
        order.tracking.kind !== 'no-driver'
      ) {
        router.replace({ pathname: '/customer/tracking', params: { orderId: order.id } });
      }
    }
  }, [query.data, router]);

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
      isRefreshing={query.isRefetching}
      onBack={() => router.back()}
      onCancel={(actionId, reason) => void runIntent({ actionId, orderId, value: reason })}
      onOpenInvoice={(invoiceId) => handleOpenInvoice(invoiceId)}
      onOpenTracking={(id) =>
        router.push({ pathname: '/customer/tracking', params: { orderId: id } })
      }
      onPaymentAction={(actionId) => void runIntent({ actionId, orderId })}
      onPickCargoImage={() => void handlePickCargoImage()}
      onPrimaryAction={(actionId) => {
        if (actionId === 'rate-order') {
          const assignedDriver = view.kind === 'content' ? view.order.assignedDriver : undefined;
          router.push({
            pathname: '/customer/review/[id]',
            params: {
              id: orderId,
              driverName: assignedDriver?.name ?? undefined,
              licensePlate: assignedDriver?.licensePlate ?? undefined,
              vehicleType: assignedDriver?.vehicleType ?? undefined,
            },
          });
          return;
        }
        void runIntent({ actionId, orderId });
      }}
      onRefresh={async () => {
        await query.refetch();
      }}
      onRetry={() => query.refetch()}
      onSendInvoiceEmail={(invoiceId, email) => void handleSendInvoiceEmail(invoiceId, email)}
      view={view}
    />
  );
}
