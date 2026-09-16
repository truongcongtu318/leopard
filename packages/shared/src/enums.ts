export * from './domain/index.js';

export const Role = ['CUSTOMER', 'DRIVER', 'ADMIN'] as const;
export type Role = (typeof Role)[number];

export const UserStatus = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof UserStatus)[number];

export const DriverAvailability = ['OFFLINE', 'AVAILABLE', 'BUSY'] as const;
export type DriverAvailability = (typeof DriverAvailability)[number];

export const StopType = ['PICKUP', 'STOP', 'DROPOFF'] as const;
export type StopType = (typeof StopType)[number];

export const MediaType = ['CARGO', 'DELIVERY_PROOF'] as const;
export type MediaType = (typeof MediaType)[number];

export const ProviderSource = ['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3'] as const;
export type ProviderSource = (typeof ProviderSource)[number];

export const InvoiceStatus = ['ISSUED', 'VOIDED'] as const;
export type InvoiceStatus = (typeof InvoiceStatus)[number];

export const PromotionDiscountType = ['PERCENT', 'FIXED'] as const;
export type PromotionDiscountType = (typeof PromotionDiscountType)[number];
