import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { driverQueryKeys } from '@leopard/mobile-core';
import type { DriverOrdersPort, DriverProofPort } from '../port';
import type {
  DriverDetailView,
} from '../model';
import type {
  DriverProofFileInput,
  DriverProofUploadResult,
} from '../DriverOrderDetailScreen';
import { stopProgressCommandStore } from '../stop-progress-command-store';
import {
  createInitialRouteEtaChannelState,
  reduceRouteEtaByRevision,
  type RouteEtaChannelState,
} from '../route-eta-adapter';

export const DRIVER_TERMINAL_STATUSES = new Set(['DELIVERED', 'RETURNED']);

interface UseDriverOrderMutationsParams {
  orderId: string;
  port: DriverOrdersPort;
  proofPort: DriverProofPort;
}

export function useDriverOrderMutations({
  orderId,
  port,
  proofPort,
}: UseDriverOrderMutationsParams) {
  const queryClient = useQueryClient();
  const queryKey = driverQueryKeys.orderDetail(orderId);
  const [inFlightStopCommand, setInFlightStopCommand] = useState<{
    stopId: string;
    step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED';
  } | null>(null);

  const executingRef = useRef(false);

  const executeLifecycleMutation = useMutation({
    mutationFn: async (commandId: string) => {
      if (executingRef.current) return null;
      executingRef.current = true;
      try {
        const next = await port.executeLifecycle(commandId);
        queryClient.setQueryData(queryKey, next);
        const nextStatus =
          next.kind === 'content' && 'status' in next.order ? next.order.status : null;
        if (nextStatus && DRIVER_TERMINAL_STATUSES.has(nextStatus)) {
          void queryClient.invalidateQueries({ queryKey: ['driver', 'orders'] });
        }
        return next;
      } finally {
        executingRef.current = false;
      }
    },
    onError: (error) => {
      Alert.alert(
        'Lỗi chuyển trạng thái',
        error instanceof Error ? error.message : 'Không thể thực hiện tác vụ đơn hàng.',
      );
    },
  });

  const recordStopProgressMutation = useMutation({
    mutationFn: async ({
      stopId,
      step,
    }: {
      stopId: string;
      step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED';
    }) => {
      if (!port.recordStopProgress) return null;
      if (!stopProgressCommandStore.acquireLock(orderId, stopId, step)) {
        return null;
      }

      setInFlightStopCommand({ stopId, step });

      try {
        const clientRequestId = await stopProgressCommandStore.getOrCreateCommandId(
          orderId,
          stopId,
          step,
        );

        const response = await port.recordStopProgress(orderId, stopId, {
          step,
          clientRequestId,
          occurredAt: new Date().toISOString(),
        });

        await stopProgressCommandStore.clearCommandId(orderId, stopId, step);
        return { response, stopId, step };
      } catch (error: any) {
        const statusCode = error?.status ?? error?.statusCode;
        if (statusCode === 400 || statusCode === 403) {
          await stopProgressCommandStore.clearCommandId(orderId, stopId, step);
        }
        throw error;
      } finally {
        stopProgressCommandStore.releaseLock(orderId, stopId, step);
        setInFlightStopCommand(null);
      }
    },
    onSuccess: async (result) => {
      if (!result) return;
      const { response } = result;
      if (response.currentRouteEta) {
        queryClient.setQueryData<RouteEtaChannelState>(
          driverQueryKeys.routeEta(orderId),
          (current) => {
            const base = current ?? createInitialRouteEtaChannelState(orderId);
            return reduceRouteEtaByRevision(base, {
              kind: 'STOP_PROGRESS_RESPONSE',
              response: response.currentRouteEta,
            });
          },
        );
      }
      await queryClient.refetchQueries({ queryKey });
    },
    onError: (error) => {
      Alert.alert(
        'Lỗi ghi nhận tiến trình',
        error instanceof Error ? error.message : 'Không thể ghi nhận tiến trình điểm dừng.',
      );
    },
  });

  async function handleSelectProof(file: DriverProofFileInput): Promise<DriverProofUploadResult> {
    const currentView = queryClient.getQueryData<DriverDetailView>(queryKey);
    const isPickupLeg =
      currentView?.kind === 'content' &&
      currentView.accessScope === 'ASSIGNED_FULL' &&
      currentView.order.status === 'PICKING_UP';

    const commandId = isPickupLeg
      ? `cmd-select-pickup-proof-${orderId}`
      : `cmd-select-proof-${orderId}`;

    const proof = await proofPort.uploadProof(commandId, file);

    const ok = proof.kind === 'persisted' || proof.kind === 'uploading';
    if (!ok) {
      return { ok: false, nextCommandId: null };
    }

    const nextCommandId = isPickupLeg
      ? `cmd-transit-${orderId}`
      : `cmd-deliver-${orderId}`;

    queryClient.setQueryData(queryKey, (current: DriverDetailView | undefined) => {
      if (!current || current.kind !== 'content') return current;
      return {
        ...current,
        proof,
        primaryTask: {
          kind: 'advance-lifecycle',
          command: {
            id: nextCommandId,
            label: isPickupLeg
              ? 'Đã lấy hàng — bắt đầu giao'
              : 'Xác nhận hoàn tất giao hàng',
            targetStatus: isPickupLeg ? 'IN_TRANSIT' : 'DELIVERED',
            pendingLabel: 'Đang ghi nhận...',
          },
        },
      };
    });

    return { ok, nextCommandId };
  }

  return {
    executeTask: (commandId: string) => executeLifecycleMutation.mutateAsync(commandId),
    isExecuting: executeLifecycleMutation.isPending || executingRef.current,
    recordStopProgress: async (stopId: string, step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED') => {
      await recordStopProgressMutation.mutateAsync({ stopId, step });
    },
    inFlightStopCommand,
    selectProof: handleSelectProof,
  };
}
