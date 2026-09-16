import type { PageQuery } from './api.js';
import type { PaymentStatus, ProviderSource, OrderStatus } from './enums.js';

export interface AdminDashboardDto {
  totalUsers: number;
  totalOrders: number;
  activeFleets: number;
  revenueVnd: number;
}

export interface AdminUserSummaryDto {
  id: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AdminUserQuery extends PageQuery {
  role?: string;
  status?: string;
  q?: string;
}

export interface AdminFleetSummaryDto {
  id: string;
  name: string;
  createdAt: string;
  driversCount: number;
  activeOrdersCount: number;
}

export interface AdminFleetQuery extends PageQuery {
  q?: string;
}

export interface AdminUpdateUserStatusCommand {
  status: 'ACTIVE' | 'DISABLED';
  reason: string;
  clientRequestId: string;
}

export interface AdminPaymentItemDto {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string | null;
  amountVnd: number;
  status: PaymentStatus;
  provider?: ProviderSource | null;
  providerReference?: string | null;
  confirmedAt?: string | null;
  confirmedByName?: string | null;
  confirmationNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentQuery extends PageQuery {
  status?: PaymentStatus;
  source?: ProviderSource;
  from?: string;
  to?: string;
  q?: string;
}

export interface AdminInvoiceItemDto {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerEmail?: string | null;
  customerTaxCode?: string | null;
  customerAddress?: string | null;
  amountVnd: number;
  vatRateVnd: number;
  totalVnd: number;
  status: 'ISSUED' | 'VOIDED';
  issuedAt: string;
  emailSentAt?: string | null;
  isMissingEmail: boolean;
  createdAt: string;
}

export interface AdminInvoiceQuery extends PageQuery {
  status?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
  missingEmail?: boolean | undefined;
}

export interface AdminAuditEntryDto {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  idempotencyRequestId?: string | null;
  metadata?: unknown;
  createdAt: string;
}

export interface AdminAuditQuery extends PageQuery {
  actorId?: string | undefined;
  action?: string | undefined;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface AdminPromotionItemDto {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscountVnd?: number | null;
  minOrderAmountVnd: number;
  usageLimit?: number | null;
  usageCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPromotionQuery extends PageQuery {
  isActive?: boolean | undefined;
  discountType?: string | undefined;
  q?: string | undefined;
}

export interface AdminCreatePromotionDto {
  code: string;
  title: string;
  description?: string | null | undefined;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscountVnd?: number | null | undefined;
  minOrderAmountVnd?: number | null | undefined;
  usageLimit?: number | null | undefined;
  expiresAt?: string | null | undefined;
}

export interface AdminUpdatePromotionDto {
  code?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  discountType?: ('PERCENT' | 'FIXED') | undefined;
  discountValue?: number | undefined;
  maxDiscountVnd?: number | null | undefined;
  minOrderAmountVnd?: number | null | undefined;
  usageLimit?: number | null | undefined;
  expiresAt?: string | null | undefined;
  isActive?: boolean | undefined;
  reason?: string | undefined;
}

export const SupportTicketStatus = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[number];

export interface AdminReportItemDto {
  id: string;
  ticketNumber: string;
  orderId: string | null;
  orderCode: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  driverId: string | null;
  driverName: string | null;
  category: string;
  description: string;
  hasPhoto: boolean;
  status: SupportTicketStatus;
  severity: 'CRITICAL' | 'MEDIUM' | 'LOW';
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportQuery extends PageQuery {
  status?: string;
  category?: string;
  orderId?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface AdminResolveReportCommand {
  resolution: 'RESOLVED' | 'CLOSED';
  note: string;
  clientRequestId?: string;
}

export interface AdminReportDetailDto {
  ticket: AdminReportItemDto;
  order: {
    id: string;
    code: string;
    status: string;
    originAddress?: string | null;
    destinationAddress?: string | null;
    priceVnd: number;
    incidentReason?: string | null;
    incidentNote?: string | null;
    incidentReportedAt?: string | null;
    createdAt: string;
  } | null;
  customer: {
    id: string;
    name: string | null;
    phone: string;
  };
  driver: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
  trackingSummary?: {
    lastPointCapturedAt?: string | null;
    totalPoints: number;
  } | null;
}

export interface AdminReviewItemDto {
  id: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  rating: number;
  comment: string | null;
  tipVnd: number;
  createdAt: string;
}

export interface AdminReviewQuery extends PageQuery {
  minRating?: number | undefined;
  maxRating?: number | undefined;
  driverId?: string | undefined;
  customerId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
}

export interface AdminHideReviewCommand {
  reason: string;
  clientRequestId?: string | undefined;
}

export interface AdminDispatchCandidateDriverDto {
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleType: string;
  distanceMeters?: number | undefined;
  etaSeconds?: number | undefined;
}

export interface AdminDispatchExceptionItemDto {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  vehicleType: string;
  status: OrderStatus;
  pickupAddress: string;
  dropoffAddress: string;
  waitingMinutes: number;
  candidateDrivers: AdminDispatchCandidateDriverDto[];
  createdAt: string;
}

export interface AdminDispatchQuery extends PageQuery {
  vehicleType?: string | undefined;
  q?: string | undefined;
}

export interface AdminReassignOrderCommand {
  driverId: string;
  reason: string;
  clientRequestId?: string | undefined;
}

export type AdminBroadcastAudience = 'ALL' | 'CUSTOMER' | 'DRIVER';
export type AdminBroadcastType = 'SYSTEM' | 'PROMO' | 'ORDER';

export interface AdminBroadcastCommand {
  audience: AdminBroadcastAudience;
  title: string;
  body: string;
  type?: AdminBroadcastType | undefined;
  clientRequestId?: string | undefined;
}

export interface AdminBroadcastLogItemDto {
  id: string;
  audience: string;
  title: string;
  body: string;
  sentCount: number;
  createdAt: string;
  createdByName: string;
}

export interface AdminBroadcastQuery {
  page?: number | undefined;
  pageSize?: number | undefined;
  q?: string | undefined;
}

export interface AdminVehiclePricingRateDto {
  baseFareVnd: number;
  perKmVnd: number;
  loadingFeeVnd?: number | undefined;
}

export interface AdminPricingConfigDto {
  minimumFareVnd: number;
  stopSurchargeVnd: number;
  vehicleRates: Record<string, AdminVehiclePricingRateDto>;
  updatedAt?: string | undefined;
  updatedByName?: string | undefined;
}

export interface AdminUpdatePricingCommand {
  minimumFareVnd: number;
  stopSurchargeVnd: number;
  vehicleRates: Record<string, AdminVehiclePricingRateDto>;
  reason: string;
  clientRequestId?: string | undefined;
}

export interface AdminSupportMessageDto {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SYSTEM';
  body: string;
  createdAt: string;
}

export interface AdminSupportConversationDto {
  orderId: string;
  orderCode: string;
  orderStatus: OrderStatus;
  customerId: string;
  customerName: string;
  customerPhone: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  lastMessageSnippet: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'ACTIVE' | 'WAITING_REPLY' | 'RESOLVED';
}

export interface AdminSupportQuery extends PageQuery {
  status?: string | undefined;
  role?: string | undefined;
  q?: string | undefined;
}

export interface AdminSendSupportMessageCommand {
  body: string;
  clientRequestId?: string | undefined;
}


