export const OrderStatus = [
  'PENDING_PAYMENT',
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'INCIDENT_CANCELLED',
  'RETURNING',
  'RETURNED',
] as const;

export type OrderStatus = (typeof OrderStatus)[number];

