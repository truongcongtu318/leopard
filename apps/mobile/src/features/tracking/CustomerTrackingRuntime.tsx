import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { createSocketFactory } from '../../api/socket-client';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from '../customer/orders/adapter';
import type { CustomerOrderDetailDataView, CustomerTrackingView, LatLng } from '../customer/orders/model';
import { createCustomerTrackingSocket } from '../customer/orders/tracking-socket';
import { RealtimeTrackingScreen, type TrackingPoint, type TripBookingDetails } from './RealtimeTrackingScreen';

const ACTIVE_TRACKING_STATUSES = ['ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'IN_TRANSIT'] as const;

export type CustomerTrackingRuntimeProps = Readonly<{
  initialOrderId?: string;
}>;

function isTerminalStatus(status: string): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

function mapStatusToTripStatus(status: string): TripBookingDetails['status'] {
  switch (status) {
    case 'PICKING_UP':
      return 'LOADING';
    case 'DELIVERED':
      return 'DELIVERED';
    default:
      return 'IN_TRANSIT';
  }
}

function getDriverLabel(tracking: CustomerTrackingView): string {
  return 'driverLabel' in tracking ? tracking.driverLabel : 'Tài xế';
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

  useEffect(() => {
    if (!orderId || !status || isTerminalStatus(status)) return undefined;

    socketManager.joinOrder(orderId);
    void socketManager.connect();

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

    return () => {
      unsubscribe();
      socketManager.leaveOrder(orderId);
    };
  }, [socketManager, orderId, status, port]);

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

  const rawDistanceTotalKm = order.distanceMeters ? order.distanceMeters / 1000 : null;
  const rawDistanceRemainingKm =
    truckPoint && order.route.destination.coords
      ? haversineKm(truckPoint, order.route.destination.coords)
      : null;
  const distanceTotalKm = rawDistanceTotalKm ?? rawDistanceRemainingKm ?? 1;
  const distanceRemainingKm = Math.min(rawDistanceRemainingKm ?? distanceTotalKm, distanceTotalKm);
  const etaMinutes = Math.max(1, Math.round(order.etaDurationSeconds / 60));

  return (
    <RealtimeTrackingScreen
      driver={{
        name: getDriverLabel(order.tracking),
        rating: 4.9,
        totalTrips: 342,
        vehiclePlate: '59C-882.14',
        vehicleType: 'Xe tải',
      }}
      onBack={() => router.back()}
      onShowVietQR={() => router.push(`/customer/orders/${order.id}`)}
      trip={{
        bookingCode: order.reference,
        origin: order.route.origin.label,
        originCoords: order.route.origin.coords,
        destination: order.route.destination.label,
        destinationCoords: order.route.destination.coords,
        stops: order.route.stops.map((s) => ({
          id: s.id,
          label: s.label,
          coords: s.coords,
        })),
        cargoLabel: order.cargo.note ?? 'Hàng hóa',
        weightKg: order.cargo.weightKg ?? 0,
        priceVnd: order.priceLabel,
        distanceTotalKm,
        distanceRemainingKm,
        etaMinutes,
        etaLabel: `${etaMinutes} phút`,
        status: mapStatusToTripStatus(order.status),
        hasDeliveryProof: order.media.kind === 'available',
      }}
      truckLocation={truckPoint ?? undefined}
    />
  );
}
