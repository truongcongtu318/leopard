import type { Order, OrderStop, OrderStatusHistory } from '@prisma/client';

export interface MappedOrderStopResponse {
  id: string;
  type: string;
  sequence: number;
  address: string;
  lat: number;
  lng: number;
}

export interface MappedOrderStatusHistoryResponse {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface MappedOrderResponse {
  id: string;
  customerId: string;
  driverId: string | null;
  status: string;
  routeSnapshot: unknown;
  providerSource: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  priceVnd: number | null;
  etaSeconds: number | null;
  acceptedAt: string | null;
  pickingUpAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerPhone?: string | undefined;
  driverPhone?: string | null;
  stops?: MappedOrderStopResponse[];
  statusHistory?: MappedOrderStatusHistoryResponse[];
}

export function mapOrderResponse(
  order: Order & {
    stops?: Array<OrderStop & { lat?: number; lng?: number }>;
    statusHistory?: OrderStatusHistory[];
    customerPhone?: string;
    driverPhone?: string | null;
  },
): MappedOrderResponse {
  return {
    id: order.id,
    customerId: order.customerId,
    driverId: order.driverId,
    status: order.status,
    routeSnapshot: order.routeSnapshot,
    providerSource: order.providerSource,
    distanceMeters: order.distanceMeters,
    durationSeconds: order.durationSeconds,
    priceVnd: order.priceVnd,
    etaSeconds: order.etaSeconds,
    acceptedAt: order.acceptedAt ? order.acceptedAt.toISOString() : null,
    pickingUpAt: order.pickingUpAt ? order.pickingUpAt.toISOString() : null,
    inTransitAt: order.inTransitAt ? order.inTransitAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customerPhone: order.customerPhone,
    driverPhone: order.driverPhone ?? null,
    ...(order.stops
      ? {
          stops: order.stops
            .sort((a, b) => a.sequence - b.sequence)
            .map((stop) => ({
              id: stop.id,
              type: stop.type,
              sequence: stop.sequence,
              address: stop.address,
              lat: stop.lat ?? 0,
              lng: stop.lng ?? 0,
            })),
        }
      : {}),
    ...(order.statusHistory
      ? {
          statusHistory: order.statusHistory.map((history) => ({
            id: history.id,
            fromStatus: history.fromStatus,
            toStatus: history.toStatus,
            actorId: history.actorId,
            reason: history.reason,
            createdAt: history.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}
