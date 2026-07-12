export const Role = ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'] as const;
export type Role = (typeof Role)[number];

export const UserStatus = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof UserStatus)[number];

export const FleetMemberRole = ['OWNER', 'DRIVER'] as const;
export type FleetMemberRole = (typeof FleetMemberRole)[number];

export const FleetMemberStatus = ['INVITED', 'ACTIVE', 'REMOVED'] as const;
export type FleetMemberStatus = (typeof FleetMemberStatus)[number];

export const DriverAvailability = ['OFFLINE', 'AVAILABLE', 'BUSY'] as const;
export type DriverAvailability = (typeof DriverAvailability)[number];

export const OrderStatus = [
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof OrderStatus)[number];

export const StopType = ['PICKUP', 'STOP', 'DROPOFF'] as const;
export type StopType = (typeof StopType)[number];

export const MediaType = ['CARGO', 'DELIVERY_PROOF'] as const;
export type MediaType = (typeof MediaType)[number];

export const PaymentStatus = ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'] as const;
export type PaymentStatus = (typeof PaymentStatus)[number];

export const ProviderSource = ['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3'] as const;
export type ProviderSource = (typeof ProviderSource)[number];
