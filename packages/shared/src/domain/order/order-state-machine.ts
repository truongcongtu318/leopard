import { OrderStatus } from './order-status.js';

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['REQUESTED', 'CANCELLED'],
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PICKING_UP', 'CANCELLED', 'INCIDENT_CANCELLED'],
  PICKING_UP: ['IN_TRANSIT', 'CANCELLED', 'INCIDENT_CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'INCIDENT_CANCELLED', 'RETURNING'],
  RETURNING: ['RETURNED'],
  RETURNED: [],
  DELIVERED: [],
  CANCELLED: [],
  INCIDENT_CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function getAllowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

