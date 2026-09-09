import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { createSocketFactory } from '../../../api/socket-client';
import { pickDeviceImage } from '@leopard/mobile-core';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { createDriverHttpAdapter, createDriverProofAdapter } from './adapter';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import type { DriverDetailView, DriverTrackingView } from './model';
import { createDriverTrackingSender, isTrackingEligibleStatus } from './tracking-sender';

export type DriverOrderDetailRuntimeProps = Readonly<{
  orderId: string;
}>;

export function DriverOrderDetailRuntime({ orderId }: DriverOrderDetailRuntimeProps) {
  const port = useMemo(() => createDriverHttpAdapter(), []);
  const proofPort = useMemo(
    () => createDriverProofAdapter(undefined, { filePicker: pickDeviceImage }),
    [],
  );
  const sender = useMemo(
    () => createDriverTrackingSender({ socketFactory: createSocketFactory }),
    [],
  );
  const queryClient = useQueryClient();
  const queryKey = ['driver', 'order', orderId];

  const router = useRouter();
  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrderDetailView(orderId),
  });

  const [liveTracking, setLiveTracking] = useState<DriverTrackingView | null>(null);
  const status =
    query.data && query.data.kind === 'content' ? query.data.order.status : null;
  const startedOrderRef = useRef<string | null>(null);

  useEffect(() => {
    const subscription = sender.observeHealth(orderId, setLiveTracking);
    return () => subscription.unsubscribe();
  }, [sender, orderId]);

  useEffect(() => {
    if (!status) return;
    if (startedOrderRef.current !== orderId) {
      startedOrderRef.current = orderId;
      void sender.start(orderId, status);
    } else {
      sender.handleOrderStatusChange(status);
    }
  }, [sender, orderId, status]);

  useEffect(() => {
    return () => sender.destroy();
  }, [sender]);

  useEffect(() => {
    if (!isTrackingEligibleStatus(status)) return undefined;

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function startWatching() {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (permissionStatus !== 'granted') {
        sender.setPermissionDenied(true);
        return;
      }

      sender.setPermissionDenied(false);
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
        (position) => {
          void sender.sendPoint({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy ?? undefined,
            heading: position.coords.heading,
            speed: position.coords.speed,
            capturedAt: new Date(position.timestamp).toISOString(),
          });
        },
      );
    }

    void startWatching();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [sender, status]);

  if (query.isPending) {
    return (
      <ScreenScaffold
        eyebrow="DRIVER · FIELD COCKPIT"
        headerTone="ink"
        onBack={() => router.back()}
        title="Chi tiết đơn"
      >
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenScaffold
        eyebrow="DRIVER · FIELD COCKPIT"
        headerTone="ink"
        onBack={() => router.back()}
        title="Chi tiết đơn"
      >
        <ScreenState actionLabel="Thử lại" onAction={() => query.refetch()} state="error" />
      </ScreenScaffold>
    );
  }

  const view: DriverDetailView =
    query.data.kind === 'content' && liveTracking
      ? { ...query.data, tracking: liveTracking }
      : query.data;

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
      onBack={() => router.back()}
      onExecuteTask={(commandId) => void handleExecuteTask(commandId)}
      onOpenLocationSettings={() => void Linking.openSettings()}
      onRetry={() => {
        void query.refetch();
        void sender.retryConnection(orderId);
      }}
      onRetryProof={(commandId) => void handleExecuteTask(commandId)}
      onSelectProof={() => void handleSelectProof()}
      view={view}
    />
  );
}
