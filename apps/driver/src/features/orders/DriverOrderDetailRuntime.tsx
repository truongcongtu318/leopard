import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { createSocketFactory } from '@leopard/mobile-core';
import { pickDeviceImage, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { DriverIncidentModal, type DriverIncidentSubmitPayload } from './DriverIncidentModal';
import { createDriverHttpAdapter, createDriverProofAdapter } from './adapter';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import type { DriverDetailView, DriverTrackingView } from './model';
import { createDriverTrackingSender, isTrackingEligibleStatus } from './tracking-sender';

export type DriverOrderDetailRuntimeProps = Readonly<{
  orderId: string;
}>;

const DRIVER_TERMINAL_STATUSES = new Set(['DELIVERED', 'RETURNED']);

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
    // Poll while the driver has an active leg so an unexpected
    // customer/admin cancellation is caught within a bounded time even if
    // the driver never manually refreshes (see the effect below that reacts
    // to it with an alert).
    refetchInterval: (q) => {
      const data = q.state.data;
      const currentStatus =
        data && data.kind === 'content' && 'status' in data.order ? data.order.status : null;
      return currentStatus === 'ACCEPTED' ||
        currentStatus === 'PICKING_UP' ||
        currentStatus === 'IN_TRANSIT'
        ? 8000
        : false;
    },
  });

  const [liveTracking, setLiveTracking] = useState<DriverTrackingView | null>(null);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [isReportingIncident, setIsReportingIncident] = useState(false);
  const executingRef = useRef(false);

  const status =
    query.data && query.data.kind === 'content' ? query.data.order.status : null;
  const startedOrderRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!status) return;
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    const wasDriverActive =
      previousStatus === 'ACCEPTED' ||
      previousStatus === 'PICKING_UP' ||
      previousStatus === 'IN_TRANSIT';

    // Only react to a CANCELLED transition seen while this screen was open —
    // that means the customer/admin cancelled it (a driver-initiated
    // incident report transitions to INCIDENT_CANCELLED/RETURNING instead,
    // never CANCELLED), so the driver would otherwise keep navigating to a
    // stop that no longer needs them.
    if (wasDriverActive && status === 'CANCELLED') {
      Alert.alert(
        'Đơn đã bị hủy',
        'Khách hàng hoặc quản trị viên đã hủy đơn hàng này. Bạn đã được giải phóng khỏi chuyến.',
        [{ text: 'Đã hiểu', onPress: () => router.back() }],
      );
    }
  }, [status, router]);

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
    if (executingRef.current) return;
    executingRef.current = true;
    try {
      const next = await port.executeLifecycle(commandId);
      queryClient.setQueryData(queryKey, next);
      const nextStatus =
        next.kind === 'content' && 'status' in next.order ? next.order.status : null;
      if (nextStatus && DRIVER_TERMINAL_STATUSES.has(nextStatus)) {
        void queryClient.invalidateQueries({ queryKey: ['driver', 'orders'] });
        router.back();
      }
    } finally {
      executingRef.current = false;
    }
  }

  async function handleSelectProof() {
    const file = await proofPort.selectProof();
    if (!file) return;
    const commandId = `cmd-select-proof-${orderId}`;
    const proof = await proofPort.uploadProof(commandId);
    queryClient.setQueryData(queryKey, (current: typeof query.data) => {
      if (!current || current.kind !== 'content') return current;
      return {
        ...current,
        proof,
        primaryTask: {
          kind: 'advance-lifecycle',
          command: {
            id: `cmd-deliver-${orderId}`,
            label: 'Xác nhận hoàn tất giao hàng',
            targetStatus: 'DELIVERED',
            pendingLabel: 'Đang ghi nhận...',
          },
        },
      };
    });
  }

  async function handleReportIncident(payload: DriverIncidentSubmitPayload) {
    if (!port.reportIncident) return;
    setIsReportingIncident(true);
    try {
      const next = await port.reportIncident(orderId, payload);
      queryClient.setQueryData(queryKey, next);
      setIncidentModalVisible(false);
    } finally {
      setIsReportingIncident(false);
    }
  }

  return (
    <>
      <DriverOrderDetailScreen
        onBack={() => router.back()}
        onExecuteTask={(commandId) => void handleExecuteTask(commandId)}
        onOpenIncidentModal={() => setIncidentModalVisible(true)}
        onOpenLocationSettings={() => void Linking.openSettings()}
        onRetry={() => {
          void query.refetch();
          void sender.retryConnection(orderId);
        }}
        onRetryProof={(commandId) => void handleExecuteTask(commandId)}
        onSelectProof={() => void handleSelectProof()}
        view={view}
      />
      <DriverIncidentModal
        isSubmitting={isReportingIncident}
        onClose={() => setIncidentModalVisible(false)}
        onSubmit={(payload) => void handleReportIncident(payload)}
        orderReference={query.data?.kind === 'content' ? query.data.order.reference : undefined}
        visible={incidentModalVisible}
      />
    </>
  );
}
