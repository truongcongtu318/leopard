import type { Order, OrderStop, OrderStatusHistory, MediaObject } from '@prisma/client';

export interface MappedOrderStopResponse {
  id: string;
  type: string;
  sequence: number;
  address: string;
  lat: number;
  lng: number;
  contactName?: string | null;
  contactPhone?: string | null;
  note?: string | null;
}

export interface MappedOrderStatusHistoryResponse {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface MappedAssignedDriverResponse {
  id: string;
  name: string | null;
  phone: string | null;
  licensePlate: string | null;
  vehicleType: string | null;
}

export interface OrderDriverInput {
  id: string;
  name?: string | null;
  phone?: string | null;
  driverProfile?: {
    licensePlate?: string | null;
    vehicleType?: string | null;
  } | null;
}

export interface CurrentContactSummary {
  targetRole: 'SENDER' | 'RECIPIENT' | 'COMPLETED' | 'NONE';
  name: string | null;
  phone: string | null;
}

export interface MappedOrderResponse {
  id: string;
  customerId: string;
  driverId: string | null;
  assignedDriver?: MappedAssignedDriverResponse | null;
  vehicleType?: string;
  cargoWeightKg?: number | null;
  cargoNote?: string | null;
  status: string;
  routeSnapshot: unknown;
  providerSource: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  priceVnd: number | null;
  etaSeconds: number | null;
  proofMediaId?: string | null;
  incidentReason?: string | null;
  incidentNote?: string | null;
  incidentReportedAt?: string | null;
  acceptedAt: string | null;
  pickingUpAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  stops?: MappedOrderStopResponse[];
  currentContact?: CurrentContactSummary;
  statusHistory?: MappedOrderStatusHistoryResponse[];
  media?: Array<{ id: string; type: string; createdAt: string }>;
}

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const clean = phone.trim();
  if (clean.length < 7) return '***';
  return clean.slice(0, 3) + '***' + clean.slice(-4);
}

export function mapOrderResponse(
  order: Order & {
    stops?: Array<
      OrderStop & {
        lat?: number;
        lng?: number;
        contactName?: string | null;
        contactPhone?: string | null;
        note?: string | null;
      }
    >;
    statusHistory?: OrderStatusHistory[];
    mediaObjects?: MediaObject[];
    driver?: OrderDriverInput | null;
  },
): MappedOrderResponse {
  const assignedDriver: MappedAssignedDriverResponse | null = order.driver
    ? {
      id: order.driver.id,
      name: order.driver.name ?? null,
      phone: order.driver.phone ?? null,
      licensePlate: order.driver.driverProfile?.licensePlate ?? null,
      vehicleType: order.driver.driverProfile?.vehicleType ?? null,
    }
    : null;

  const sortedStops = order.stops ? [...order.stops].sort((a, b) => a.sequence - b.sequence) : [];
  const pickupStop = sortedStops.find((s) => s.type === 'PICKUP') ?? sortedStops[0];
  const dropoffStop = [...sortedStops].reverse().find((s) => s.type === 'DROPOFF') ?? sortedStops[sortedStops.length - 1];

  let currentContact: CurrentContactSummary = {
    targetRole: 'NONE',
    name: null,
    phone: null,
  };

  if (order.status === 'ACCEPTED' || order.status === 'PICKING_UP') {
    currentContact = {
      targetRole: 'SENDER',
      name: pickupStop?.contactName ?? null,
      phone: pickupStop?.contactPhone ?? null,
    };
  } else if (order.status === 'IN_TRANSIT') {
    currentContact = {
      targetRole: 'RECIPIENT',
      name: dropoffStop?.contactName ?? null,
      phone: dropoffStop?.contactPhone ?? null,
    };
  } else if (
    order.status === 'DELIVERED' ||
    order.status === 'CANCELLED' ||
    order.status === 'INCIDENT_CANCELLED' ||
    order.status === 'RETURNED'
  ) {
    currentContact = {
      targetRole: 'COMPLETED',
      name: null,
      phone: null,
    };
  }

  // Terminal statuses (order fully wrapped up, no further contact needed)
  // must fully redact — spec §3.4's projection matrix says "Che hoàn toàn
  // SĐT" for DELIVERED/CANCELLED, not the partial in-transit-style mask.
  const isTerminal =
    order.status === 'DELIVERED' ||
    order.status === 'CANCELLED' ||
    order.status === 'INCIDENT_CANCELLED' ||
    order.status === 'RETURNED';

  const mappedStops: MappedOrderStopResponse[] = sortedStops.map((stop) => {
    let projectedPhone: string | null = null;
    let projectedName: string | null = stop.contactName ?? null;

    if (order.status === 'REQUESTED') {
      // Do not expose sender/recipient identity in the open pool at all.
      projectedPhone = null;
      projectedName = null;
    } else if (order.status === 'ACCEPTED' || order.status === 'PICKING_UP') {
      if (stop.type === 'PICKUP') {
        projectedPhone = stop.contactPhone ?? null;
      } else {
        projectedPhone = maskPhone(stop.contactPhone);
      }
    } else if (order.status === 'IN_TRANSIT') {
      if (stop.type === 'DROPOFF') {
        projectedPhone = stop.contactPhone ?? null;
      } else {
        projectedPhone = maskPhone(stop.contactPhone);
      }
    } else if (isTerminal) {
      projectedPhone = null;
    } else {
      // RETURNING and any other in-progress status not explicitly listed
      // above: keep the conservative partial mask rather than exposing.
      projectedPhone = maskPhone(stop.contactPhone);
    }

    return {
      id: stop.id,
      type: stop.type,
      sequence: stop.sequence,
      address: stop.address,
      lat: stop.lat ?? 0,
      lng: stop.lng ?? 0,
      contactName: projectedName,
      contactPhone: projectedPhone,
      note: stop.note ?? null,
    };
  });

  return {
    id: order.id,
    customerId: order.customerId,
    driverId: order.driverId,
    assignedDriver,
    vehicleType: order.vehicleType,
    cargoWeightKg: order.cargoWeightKg ?? null,
    cargoNote: order.cargoNote ?? null,
    status: order.status,
    routeSnapshot: order.routeSnapshot,
    providerSource: order.providerSource,
    distanceMeters: order.distanceMeters,
    durationSeconds: order.durationSeconds,
    priceVnd: order.priceVnd,
    etaSeconds: order.etaSeconds,
    proofMediaId: order.proofMediaId ?? null,
    incidentReason: order.incidentReason ?? null,
    incidentNote: order.incidentNote ?? null,
    incidentReportedAt: order.incidentReportedAt ? order.incidentReportedAt.toISOString() : null,
    acceptedAt: order.acceptedAt ? order.acceptedAt.toISOString() : null,
    pickingUpAt: order.pickingUpAt ? order.pickingUpAt.toISOString() : null,
    inTransitAt: order.inTransitAt ? order.inTransitAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    ...(order.stops ? { stops: mappedStops } : {}),
    ...(order.stops && order.stops.length > 0 ? { currentContact } : {}),
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
    ...(order.mediaObjects
      ? {
        media: order.mediaObjects.map((m) => ({
          id: m.id,
          type: m.type,
          createdAt: m.createdAt.toISOString(),
        })),
      }
      : {}),
  };
}
