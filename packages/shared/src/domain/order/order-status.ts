export const OrderStatus = [
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

