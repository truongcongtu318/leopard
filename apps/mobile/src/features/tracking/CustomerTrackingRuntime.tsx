import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { createSocketFactory } from '@leopard/mobile-core';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from '../customer/orders/adapter';
import type { CustomerOrderDetailDataView, CustomerTrackingView, LatLng } from '../customer/orders/model';
import { createCustomerTrackingSocket } from '../customer/orders/tracking-socket';
import {
  RealtimeTrackingScreen,
  type DriverInfo,
  type TrackingPoint,
  type TripBookingDetails,
} from './RealtimeTrackingScreen';

const ACTIVE_TRACKING_STATUSES = [
  'ACCEPTED',
  'PICKING_UP',
  'PICKED_UP',
  'IN_TRANSIT',
  'RETURNING',
] as const;

export type CustomerTrackingRuntimeProps = Readonly<{
  initialOrderId?: string;
}>;

function isTerminalStatus(status: string): boolean {
  return (
    status === 'DELIVERED' ||
    status === 'CANCELLED' ||
    status === 'RETURNED' ||
    status === 'INCIDENT_CANCELLED'
  );
}

/**
 * Mirrors the driver's own mission steps so the customer's tracking header
 * flips the instant the cockpit reports a new stage.
 */
function mapStatusToTripStatus(status: string): TripBookingDetails['status'] {
  switch (status) {
    case 'ACCEPTED':
      return 'ACCEPTED';
    case 'PICKING_UP':
      return 'PICKING_UP';
    case 'RETURNING':
      return 'RETURNING';
    case 'DELIVERED':
    case 'RETURNED':
      return 'DELIVERED';
    default:
      return 'IN_TRANSIT';
  }
}

function getDriverLabel(tracking: CustomerTrackingView): string {
  return 'driverLabel' in tracking ? tracking.driverLabel : 'Tài xế';
}

/** Newest driver coordinate carried by a tracking view, when there is one. */
function resolveTrackingCoords(
  tracking: CustomerTrackingView,
): { lat: number; lng: number } | null {
  if ('coords' in tracking && tracking.coords) return tracking.coords;
  if ('point' in tracking && tracking.point) {
    return { lat: tracking.point.latitude, lng: tracking.point.longitude };
  }
  return null;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function CustomerTrackingRuntime({ initialOrderId }: CustomerTrackingRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const socketManager = useMemo(
    () => createCustomerTrackingSocket({ socketFactory: createSocketFactory }),
    [],
  );
  const router = useRouter();

  const [orderId, setOrderId] = useState<string | null>(initialOrderId ?? null);
  const [resolvingActiveOrder, setResolvingActiveOrder] = useState(!initialOrderId);
  const [order, setOrder] = useState<CustomerOrderDetailDataView | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [truckPoint, setTruckPoint] = useState<TrackingPoint | null>(null);

  // No order was named explicitly (opened from the Home "active order" shortcut) —
  // find the customer's own in-progress order instead of hardcoding one.
  useEffect(() => {
    if (initialOrderId) return undefined;
    let active = true;
    setResolvingActiveOrder(true);

    void port
      .getOrdersView('ALL')
      .then((view) => {
        if (!active) return;
        const activeOrder =
          view.kind === 'content'
            ? view.orders.find((candidate) =>
                (ACTIVE_TRACKING_STATUSES as readonly string[]).includes(candidate.status),
              )
            : undefined;
        setOrderId(activeOrder?.id ?? null);
      })
      .catch(() => {
        if (active) setOrderId(null);
      })
      .finally(() => {
        if (active) setResolvingActiveOrder(false);
      });

    return () => {
      active = false;
    };
  }, [initialOrderId, port]);

  useEffect(() => {
    if (!orderId) return undefined;
    let active = true;

    void port
      .getOrderDetailView(orderId)
      .then((detail) => {
        if (!active) return;
        if (detail.kind === 'content') {
          setOrder(detail.order);
          // The REST payload already carries the newest point; paint it before
          // the socket replays anything so the map is never blank on open.
          const coords = resolveTrackingCoords(detail.order.tracking);
          if (coords) {
            setTruckPoint((current) => current ?? { ...coords, timestamp: new Date().toISOString() });
          } else if (detail.order.route.routeCoords && detail.order.route.routeCoords.length > 0) {
            const firstPoint = detail.order.route.routeCoords[0];
            setTruckPoint((current) => current ?? { lat: firstPoint.lat, lng: firstPoint.lng, timestamp: new Date().toISOString() });
          } else if (detail.order.route.origin.coords) {
            setTruckPoint((current) => current ?? { ...detail.order.route.origin.coords!, timestamp: new Date().toISOString() });
          }
        } else {
          setLoadError(true);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, [orderId, port]);

  const status = order?.status ?? null;
  // Connecting/disconnecting on every driver step would drop the pin mid-trip,
  // so the effect keys off these two booleans rather than the status string.
  const hasStatus = status !== null;
  const isTerminal = status !== null && isTerminalStatus(status);

  useEffect(() => {
    if (!orderId || !hasStatus || isTerminal) return undefined;

    const unsubscribe = socketManager.subscribe({
      onPointUpdated: (update) => {
        if (update.orderId !== orderId) return;
        setTruckPoint({
          lat: update.point.latitude,
          lng: update.point.longitude,
          timestamp: update.point.capturedAt,
        });
      },
      onStatusUpdated: (update) => {
        if (update.orderId !== orderId) return;
        void port.getOrderDetailView(orderId).then((detail) => {
          if (detail.kind === 'content') setOrder(detail.order);
        });
      },
    });

    socketManager.joinOrder(orderId);
    void socketManager.connect();

    return () => {
      unsubscribe();
      socketManager.leaveOrder(orderId);
    };
  }, [socketManager, orderId, hasStatus, isTerminal, port]);

  useEffect(() => {
    return () => socketManager.destroy();
  }, [socketManager]);

  if (resolvingActiveOrder || (orderId && !order && !loadError)) {
    return (
      <ScreenScaffold title="Theo dõi đơn hàng">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (!orderId || loadError) {
    return (
      <ScreenScaffold title="Theo dõi đơn hàng">
        <ScreenState
          actionLabel="Xem đơn hàng của tôi"
          message="Bạn chưa có đơn hàng nào đang được vận chuyển."
          onAction={() => router.replace('/customer/orders')}
          state="empty"
          title="Chưa có chuyến đang giao"
        />
      </ScreenScaffold>
    );
  }

  if (!order) {
    return (
      <ScreenScaffold title="Theo dõi đơn hàng">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  const handleBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/customer/orders');
    }
  };

  // Chặn đơn chưa có tài xế: không render màn hình tài xế giả.
  if (order.status === 'REQUESTED' || order.tracking.kind === 'no-driver') {
    return (
      <ScreenScaffold onBack={handleBack} title="Theo dõi đơn hàng">
        <ScreenState
          actionLabel="Xem chi tiết đơn hàng"
          message="Chưa có tài xế nhận chuyến. Bản đồ GPS sẽ khả dụng khi tài xế nhận đơn."
          onAction={() => router.replace(`/customer/orders/${order.id}`)}
          state="empty"
          title="Chưa có tài xế nhận chuyến"
        />
      </ScreenScaffold>
    );
  }

  const handleReviewTrip = () => {
    router.push({
      pathname: '/customer/review/[id]',
      params: {
        id: order.id,
        driverName: order.assignedDriver?.name ?? undefined,
        licensePlate: order.assignedDriver?.licensePlate ?? undefined,
        vehicleType: order.assignedDriver?.vehicleType ?? undefined,
      },
    });
  };

  return (
    <ActiveTrackingView
      onBack={handleBack}
      onReviewTrip={handleReviewTrip}
      onShowVietQR={() => router.push(`/customer/orders/${order.id}`)}
      order={order}
      truckPoint={truckPoint}
    />
  );
}

type ActiveTrackingViewProps = Readonly<{
  order: CustomerOrderDetailDataView;
  truckPoint: TrackingPoint | null;
  onBack: () => void;
  onShowVietQR: () => void;
  onReviewTrip?: () => void;
}>;

function ActiveTrackingView({
  onBack,
  onReviewTrip,
  onShowVietQR,
  order,
  truckPoint,
}: ActiveTrackingViewProps) {
  const rawDistanceTotalKm = order.distanceMeters ? order.distanceMeters / 1000 : null;
  const rawDistanceRemainingKm =
    truckPoint && order.route.destination.coords
      ? haversineKm(truckPoint, order.route.destination.coords)
      : null;
  const distanceTotalKm = rawDistanceTotalKm ?? rawDistanceRemainingKm ?? 1;
  const exactRemainingKm = Math.min(rawDistanceRemainingKm ?? distanceTotalKm, distanceTotalKm);
  // Round to 1 decimal place (100m step) so continuous GPS micro-jitter does not
  // thrash object references and trigger full Bottom Sheet re-renders.
  const roundedDistanceRemainingKm = Math.round(exactRemainingKm * 10) / 10;
  const etaMinutes = Math.max(1, Math.round(order.etaDurationSeconds / 60));

  const assignedDriver = order.assignedDriver ?? null;
  const driverName =
    assignedDriver?.name?.trim() || getDriverLabel(order.tracking) || 'Đang điều phối';

  const isSimulated = order.etaSource === 'DEMO';

  const memoizedDriver = useMemo<DriverInfo>(
    () => ({
      name: driverName,
      ...(assignedDriver?.phone ? { phone: assignedDriver.phone } : {}),
      ...(assignedDriver?.licensePlate ? { vehiclePlate: assignedDriver.licensePlate } : {}),
      ...(assignedDriver?.vehicleType ? { vehicleType: assignedDriver.vehicleType } : {}),
    }),
    [driverName, assignedDriver?.phone, assignedDriver?.licensePlate, assignedDriver?.vehicleType],
  );

  const memoizedTrip = useMemo<TripBookingDetails>(
    () => ({
      bookingCode: order.reference,
      origin: order.route.origin.label,
      originCoords: order.route.origin.coords,
      destination: order.route.destination.label,
      destinationCoords: order.route.destination.coords,
      stops: order.route.stops,
      cargoLabel: order.cargo.note ?? 'Hàng hóa',
      weightKg: order.cargo.weightKg ?? 0,
      priceVnd: order.priceLabel,
      distanceTotalKm,
      distanceRemainingKm: roundedDistanceRemainingKm,
      etaMinutes,
      etaLabel: `${etaMinutes} phút`,
      status: mapStatusToTripStatus(order.status),
      hasDeliveryProof: order.media.kind === 'available',
      isSimulated,
      routeCoords: order.route.routeCoords,
    }),
    [
      order.reference,
      order.route.origin.label,
      order.route.origin.coords,
      order.route.destination.label,
      order.route.destination.coords,
      order.route.stops,
      order.cargo.note,
      order.cargo.weightKg,
      order.priceLabel,
      distanceTotalKm,
      roundedDistanceRemainingKm,
      etaMinutes,
      order.status,
      order.media.kind,
      isSimulated,
      order.route.routeCoords,
    ],
  );

  return (
    <RealtimeTrackingScreen
      driver={memoizedDriver}
      isSimulatedData={isSimulated}
      onBack={onBack}
      onReviewTrip={onReviewTrip}
      onShowVietQR={onShowVietQR}
      trip={memoizedTrip}
      truckLocation={truckPoint ?? undefined}
    />
  );
}
