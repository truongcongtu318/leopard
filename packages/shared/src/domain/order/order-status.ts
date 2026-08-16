export const OrderStatus = [
  'REQUESTED',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof OrderStatus)[number];
