import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { pickDeviceImage } from '../../../media/device-image-picker';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { createDriverHttpAdapter, createDriverProofAdapter } from './adapter';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';

export type DriverOrderDetailRuntimeProps = Readonly<{
  orderId: string;
}>;

export function DriverOrderDetailRuntime({ orderId }: DriverOrderDetailRuntimeProps) {
  const port = useMemo(() => createDriverHttpAdapter(), []);
  const proofPort = useMemo(
    () => createDriverProofAdapter(undefined, { filePicker: pickDeviceImage }),
    [],
  );
  const queryClient = useQueryClient();
  const queryKey = ['driver', 'order', orderId];

  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrderDetailView(orderId),
  });

  if (query.isPending) {
    return (
      <ScreenScaffold eyebrow="DRIVER · FIELD COCKPIT" headerTone="ink" title="Chi tiết đơn">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenScaffold eyebrow="DRIVER · FIELD COCKPIT" headerTone="ink" title="Chi tiết đơn">
        <ScreenState actionLabel="Thử lại" onAction={() => query.refetch()} state="error" />
      </ScreenScaffold>
    );
  }

  async function handleExecuteTask(commandId: string) {
    const next = await port.executeLifecycle(commandId);
    queryClient.setQueryData(queryKey, next);
  }

  async function handleSelectProof() {
    const file = await proofPort.selectProof();
    if (!file) return;
    const commandId = `cmd-select-proof-${orderId}`;
    const proof = await proofPort.uploadProof(commandId);
    queryClient.setQueryData(queryKey, (current: typeof query.data) => {
      if (!current || current.kind !== 'content') return current;
      return { ...current, proof };
    });
  }

  return (
    <DriverOrderDetailScreen
      onExecuteTask={(commandId) => void handleExecuteTask(commandId)}
      onRetry={() => query.refetch()}
      onRetryProof={(commandId) => void handleExecuteTask(commandId)}
      onSelectProof={() => void handleSelectProof()}
      view={query.data}
    />
  );
}
