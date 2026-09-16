import { z } from 'zod';
import { pageQuerySchema } from './common.js';
import { PaymentStatus, ProviderSource, InvoiceStatus, PromotionDiscountType, SupportTicketStatus } from '@leopard/shared';

export const adminPaymentQuerySchema = pageQuerySchema.extend({
  status: z.enum(PaymentStatus).optional(),
  source: z.enum(ProviderSource).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export type AdminPaymentQueryInput = z.infer<typeof adminPaymentQuerySchema>;

export const adminInvoiceQuerySchema = pageQuerySchema.extend({
  status: z.enum(InvoiceStatus).optional(),
  missingEmail: z.coerce.boolean().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export type AdminInvoiceQueryInput = z.infer<typeof adminInvoiceQuerySchema>;

export const adminAuditQuerySchema = pageQuerySchema.extend({
  actorId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AdminAuditQueryInput = z.infer<typeof adminAuditQuerySchema>;

export const adminPromotionQuerySchema = pageQuerySchema.extend({
  isActive: z.coerce.boolean().optional(),
  discountType: z.enum(PromotionDiscountType).optional(),
  q: z.string().optional(),
});

export type AdminPromotionQueryInput = z.infer<typeof adminPromotionQuerySchema>;

export const adminCreatePromotionSchema = z.object({
  code: z.string().min(1).max(32),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  discountType: z.enum(PromotionDiscountType),
  discountValue: z.number().int().positive(),
  maxDiscountVnd: z.number().int().nonnegative().nullable().optional(),
  minOrderAmountVnd: z.number().int().nonnegative().default(0).optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export type AdminCreatePromotionInput = z.infer<typeof adminCreatePromotionSchema>;

export const adminUpdatePromotionSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  discountType: z.enum(PromotionDiscountType).optional(),
  discountValue: z.number().int().positive().optional(),
  maxDiscountVnd: z.number().int().nonnegative().nullable().optional(),
  minOrderAmountVnd: z.number().int().nonnegative().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  reason: z.string().optional(),
});

export type AdminUpdatePromotionInput = z.infer<typeof adminUpdatePromotionSchema>;

export const adminReportQuerySchema = pageQuerySchema.extend({
  status: z.enum(SupportTicketStatus).optional(),
  category: z.string().optional(),
  orderId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export type AdminReportQueryInput = z.infer<typeof adminReportQuerySchema>;

export const adminResolveReportSchema = z.object({
  resolution: z.enum(['RESOLVED', 'CLOSED']),
  note: z.string().min(5).max(1000),
  clientRequestId: z.string().optional(),
});

export type AdminResolveReportInput = z.infer<typeof adminResolveReportSchema>;

export const adminReviewQuerySchema = pageQuerySchema.extend({
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  driverId: z.string().optional(),
  customerId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export type AdminReviewQueryInput = z.infer<typeof adminReviewQuerySchema>;

export const adminHideReviewCommandSchema = z.object({
  reason: z.string().min(5).max(500),
  clientRequestId: z.string().optional(),
});

export type AdminHideReviewCommandInput = z.infer<typeof adminHideReviewCommandSchema>;

export const adminDispatchQuerySchema = pageQuerySchema.extend({
  vehicleType: z.string().optional(),
  q: z.string().optional(),
});

export type AdminDispatchQueryInput = z.infer<typeof adminDispatchQuerySchema>;

export const adminReassignOrderCommandSchema = z.object({
  driverId: z.string().min(1),
  reason: z.string().min(5).max(500),
  clientRequestId: z.string().optional(),
});

export type AdminReassignOrderCommandInput = z.infer<typeof adminReassignOrderCommandSchema>;

export const adminBroadcastCommandSchema = z.object({
  audience: z.enum(['ALL', 'CUSTOMER', 'DRIVER']),
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(2000),
  type: z.enum(['SYSTEM', 'PROMO', 'ORDER']).optional(),
  clientRequestId: z.string().optional(),
});

export type AdminBroadcastCommandInput = z.infer<typeof adminBroadcastCommandSchema>;

export const adminBroadcastQuerySchema = pageQuerySchema.extend({
  q: z.string().optional(),
});

export type AdminBroadcastQueryInput = z.infer<typeof adminBroadcastQuerySchema>;

export const adminVehiclePricingRateSchema = z.object({
  baseFareVnd: z.number().int().nonnegative(),
  perKmVnd: z.number().int().nonnegative(),
  loadingFeeVnd: z.number().int().nonnegative().optional(),
});

export type AdminVehiclePricingRateInput = z.infer<typeof adminVehiclePricingRateSchema>;

export const adminUpdatePricingCommandSchema = z.object({
  minimumFareVnd: z.number().int().nonnegative(),
  stopSurchargeVnd: z.number().int().nonnegative(),
  vehicleRates: z.record(z.string(), adminVehiclePricingRateSchema),
  reason: z.string().min(5).max(500),
  clientRequestId: z.string().optional(),
});

export type AdminUpdatePricingCommandInput = z.infer<typeof adminUpdatePricingCommandSchema>;
 
export const adminSupportQuerySchema = pageQuerySchema.extend({
  status: z.enum(['ACTIVE', 'WAITING_REPLY', 'RESOLVED']).optional(),
  role: z.enum(['CUSTOMER', 'DRIVER']).optional(),
  q: z.string().optional(),
});

export type AdminSupportQueryInput = z.infer<typeof adminSupportQuerySchema>;

export const adminSendSupportMessageCommandSchema = z.object({
  body: z.string().min(1).max(2000),
  clientRequestId: z.string().optional(),
});

export type AdminSendSupportMessageCommandInput = z.infer<typeof adminSendSupportMessageCommandSchema>;

