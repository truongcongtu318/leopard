import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { createCustomerHttpAdapter } from './adapter';
import { createCustomerMediaPickerAdapter } from './media-picker-adapter';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import type { CustomerOrderIntent } from './model';

export type CustomerOrderDetailRuntimeProps = Readonly<{
  orderId: string;
}>;

export function CustomerOrderDetailRuntime({ orderId }: CustomerOrderDetailRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const mediaPort = useMemo(() => createCustomerMediaPickerAdapter(), []);
  const queryClient = useQueryClient();
  const queryKey = ['customer', 'order', orderId];

  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrderDetailView(orderId),
  });

  if (query.isPending) {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Chi tiết đơn">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Chi tiết đơn">
        <ScreenState actionLabel="Thử lại" onAction={() => query.refetch()} state="error" />
      </ScreenScaffold>
    );
  }

  async function runIntent(intent: CustomerOrderIntent) {
    const next = await port.executeIntent(intent);
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
      onCancel={(actionId) => void runIntent({ actionId, orderId })}
      onPaymentAction={(actionId) => void runIntent({ actionId, orderId })}
      onPickCargoImage={() => void handlePickCargoImage()}
      onPrimaryAction={(actionId) => void runIntent({ actionId, orderId })}
      onRetry={() => query.refetch()}
      view={query.data}
    />
  );
}
