import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { driverQueryKeys } from '@leopard/mobile-core';
import type { OrderStatus } from '@leopard/shared';
import type { DriverOrdersPort } from '../port';
import type { DriverDetailView, DriverTrackingView } from '../model';
import type { DriverTrackingSender } from '../tracking-sender';
import { useRouteEtaChannel } from '../useRouteEtaChannel';

interface UseDriverOrderDetailParams {
  orderId: string;
  port: DriverOrdersPort;
  sender: DriverTrackingSender;
}

export function useDriverOrderDetail({
  orderId,
  port,
  sender,
}: UseDriverOrderDetailParams) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = driverQueryKeys.orderDetail(orderId);
  const [liveTracking, setLiveTracking] = useState<DriverTrackingView | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrderDetailView(orderId),
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

  const rawStatus =
    query.data && query.data.kind === 'content' && 'status' in query.data.order
      ? (query.data.order.status as OrderStatus)
      : null;

  const previousStatusRef = useRef<OrderStatus | null>(rawStatus);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = rawStatus;

    const wasDriverActive =
      previousStatus === 'ACCEPTED' ||
      previousStatus === 'PICKING_UP' ||
      previousStatus === 'IN_TRANSIT';

    if (wasDriverActive && rawStatus === 'CANCELLED') {
      Alert.alert(
        'Đơn đã bị hủy',
        'Khách hàng hoặc quản trị viên đã hủy đơn hàng này. Bạn đã được giải phóng khỏi chuyến.',
        [{ text: 'Đã hiểu', onPress: () => router.back() }],
      );
    }
  }, [rawStatus, router]);

  useEffect(() => {
    const subscription = sender.observeHealth(orderId, setLiveTracking);
    return () => subscription.unsubscribe();
  }, [sender, orderId]);

  useEffect(() => {
    if (typeof sender.observeOrderStatus !== 'function') return undefined;
    const subscription = sender.observeOrderStatus(orderId, (event) => {
      if (event.currentStatus === 'CANCELLED') {
        void queryClient.invalidateQueries({ queryKey });
        Alert.alert(
          'Đơn đã bị hủy',
          'Khách hàng hoặc quản trị viên đã hủy đơn hàng này. Bạn đã được giải phóng khỏi chuyến.',
          [{ text: 'Đã hiểu', onPress: () => router.back() }],
        );
      } else {
        void queryClient.invalidateQueries({ queryKey });
      }
    });
    return () => subscription?.unsubscribe();
  }, [sender, orderId, queryClient, queryKey, router]);

  const routeEtaResult = useRouteEtaChannel({
    orderId,
    status: rawStatus,
    port,
    sender,
  });

  const view: DriverDetailView | undefined = useMemo(() => {
    if (!query.data || query.data.kind !== 'content') {
      return query.data;
    }

    let nextContent = query.data;
    if (liveTracking) {
      nextContent = { ...nextContent, tracking: liveTracking };
    }

    if (nextContent.accessScope === 'ASSIGNED_FULL' && routeEtaResult.kind === 'content') {
      const etaView = routeEtaResult.view;
      const effectiveRouteCoords =
        etaView.polylineCoords && etaView.polylineCoords.length > 0
          ? etaView.polylineCoords
          : nextContent.order.route.routeCoords;
      const effectiveRouteSegments =
        etaView.polylineSegments && etaView.polylineSegments.length > 0
          ? etaView.polylineSegments
          : nextContent.order.route.routeSegments;

      nextContent = {
        ...nextContent,
        order: {
          ...nextContent.order,
          route: {
            ...nextContent.order.route,
            eta: etaView,
            routeCoords: effectiveRouteCoords,
            routeSegments: effectiveRouteSegments,
          },
        },
      };
    }

    return nextContent;
  }, [query.data, liveTracking, routeEtaResult]);

  return {
    query,
    view,
    status: rawStatus,
    liveTracking,
  };
}
