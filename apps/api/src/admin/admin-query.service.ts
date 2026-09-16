import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { DomainError } from '../common/domain-error.js';
import type {
  AdminDashboardDto,
  AdminUserSummaryDto,
  AdminUserQuery,
  AdminDriverSummaryDto,
  AdminDriverQuery,
  AdminOrderSummaryDto,
  AdminOrderQuery,
  AdminPaymentItemDto,
  AdminPaymentQuery,
  AdminInvoiceItemDto,
  AdminInvoiceQuery,
  AdminAuditEntryDto,
  AdminAuditQuery,
  AdminPromotionItemDto,
  AdminPromotionQuery,
  AdminReportItemDto,
  AdminReportQuery,
  AdminReportDetailDto,
  AdminReviewItemDto,
  AdminReviewQuery,
  AdminDispatchCandidateDriverDto,
  AdminDispatchExceptionItemDto,
  AdminDispatchQuery,
  AdminBroadcastLogItemDto,
  AdminBroadcastQuery,
  AdminPricingConfigDto,
  AdminSupportMessageDto,
  AdminSupportConversationDto,
  AdminSupportQuery,
} from '@leopard/shared';
import { Prisma } from '@prisma/client';
import type { User, DriverProfile, Order, PaymentIntent, Invoice, AuditLog, PromotionVoucher, SupportTicket, OrderReview, VehicleType } from '@prisma/client';
import type { Role, UserStatus, OrderStatus, PaymentStatus, ProviderSource, InvoiceStatus, PromotionDiscountType, SupportTicketStatus } from '@prisma/client';
import { DEFAULT_PRICING_CONFIG } from '../maps/domain/pricing.service.js';

@Injectable()
export class AdminQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboardDto> {
    const [totalUsers, totalOrders, revenueRes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { priceVnd: true },
        where: { status: 'DELIVERED' },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      revenueVnd: revenueRes._sum.priceVnd ?? 0,
    };
  }

  async getUsers(query: AdminUserQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role as Role;
    if (query.status) where.status = query.status as UserStatus;
    if (query.q) where.phone = { contains: query.q, mode: 'insensitive' };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items: AdminUserSummaryDto[] = users.map((u: User) => ({
      id: u.id,
      phone: u.phone ?? '',
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getDrivers(query: AdminDriverQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = { role: 'DRIVER' };
    if (query.status) where.status = query.status as UserStatus;
    if (query.q) where.phone = { contains: query.q, mode: 'insensitive' };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          driverProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type DriverWithRelations = User & {
      driverProfile: DriverProfile | null;
    };
    const items: AdminDriverSummaryDto[] = users.map((u: DriverWithRelations) => ({
      id: u.id,
      name: u.name ?? u.phone ?? '',
      phone: u.phone ?? '',
      status: u.status,
      availability: u.driverProfile?.availability ?? 'OFFLINE',
      vehicleType: u.driverProfile?.vehicleType ?? 'MOTORBIKE',
      lastKnownAt: u.driverProfile?.lastKnownAt?.toISOString() ?? null,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getOrders(query: AdminOrderQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status as OrderStatus;
    if (query.driverId) where.driverId = query.driverId;
    if (query.from && query.to) {
       where.createdAt = { gte: new Date(query.from), lte: new Date(query.to) };
    }
    if (query.q) {
       // Full-text search on order is not available on UUID; skip for now
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          driver: true,
          customer: { select: { phone: true } },
          stops: { orderBy: { sequence: 'asc' } },
          paymentIntents: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type OrderWithRelations = Order & {
      driver: User | null;
      customer: { phone: string | null };
      stops: Array<{ id: string; type: string; sequence: number; address: string }>;
      paymentIntents: Array<{ status: string }>;
    };
    // ponytail: one raw query for all stop coords (N+1 findMany per order if upgraded naively)
    const orderIds = orders.map((o) => o.id);
    const stopCoords: Array<{ orderId: string; type: string; lat: number | null; lng: number | null }> =
      orderIds.length > 0
        ? await this.prisma.$queryRaw`
            SELECT "orderId", type,
              ST_Y(location::geometry) as lat,
              ST_X(location::geometry) as lng
            FROM "OrderStop"
            WHERE "orderId" IN (${Prisma.join(orderIds.map((id) => Prisma.sql`${id}::uuid`))})
          `
        : [];
    const coordsByOrder = new Map<string, typeof stopCoords>();
    for (const row of stopCoords) {
      const list = coordsByOrder.get(row.orderId) ?? [];
      list.push(row);
      coordsByOrder.set(row.orderId, list);
    }
    const items: AdminOrderSummaryDto[] = orders.map((o: OrderWithRelations) => {
      const rawId = o.id.replace(/-/g, '');
      const suffix = rawId.slice(-4).toUpperCase();
      const pickup = o.stops.find((s) => s.type === 'PICKUP');
      const dropoff = [...o.stops].reverse().find((s) => s.type === 'DROPOFF');
      const pickupCoord = coordsByOrder.get(o.id)?.find((c) => c.type === 'PICKUP');
      const dropoffCoord = coordsByOrder.get(o.id)?.find((c) => c.type === 'DROPOFF');
      return {
        id: o.id,
        code: `LP-${suffix}`,
        status: o.status,
        driverId: o.driverId ?? undefined,
        driverName: (o.driver?.name ?? o.driver?.phone) ?? undefined,
        customerPhone: o.customer.phone ?? null,
        pickupLabel: pickup?.address ?? '',
       pickupLat: pickupCoord?.lat ?? null,
       pickupLng: pickupCoord?.lng ?? null,
       dropoffLabel: dropoff?.address ?? '',
       dropoffLat: dropoffCoord?.lat ?? null,
       dropoffLng: dropoffCoord?.lng ?? null,
       paymentStatus: o.paymentIntents[0]?.status ?? 'UNPAID',
       priceVnd: o.priceVnd ?? 0,
       createdAt: o.createdAt.toISOString(),
       updatedAt: o.updatedAt.toISOString(),
       distanceMeters: o.distanceMeters ?? 0,
     };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getPayments(query: AdminPaymentQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentIntentWhereInput = {};
    if (query.status) {
      where.status = query.status as PaymentStatus;
    }
    if (query.source) {
      where.provider = query.source as ProviderSource;
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { providerReference: { contains: q, mode: 'insensitive' } },
        { order: { customer: { phone: { contains: q, mode: 'insensitive' } } } },
        { order: { customer: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, payments] = await Promise.all([
      this.prisma.paymentIntent.count({ where }),
      this.prisma.paymentIntent.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          order: {
            include: {
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          confirmedBy: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type PaymentWithRelations = PaymentIntent & {
      order: Order & {
        customer: { id: string; name: string | null; phone: string | null };
      };
      confirmedBy: { id: string; name: string | null; phone: string | null } | null;
    };

    const items: AdminPaymentItemDto[] = (payments as PaymentWithRelations[]).map((p) => {
      const rawId = p.orderId.replace(/-/g, '');
      const suffix = rawId.slice(-4).toUpperCase();
      return {
        id: p.id,
        orderId: p.orderId,
        orderCode: `LP-${suffix}`,
        customerName: p.order?.customer?.name ?? p.order?.customer?.phone ?? 'Khách hàng',
        customerPhone: p.order?.customer?.phone ?? null,
        amountVnd: p.amountVnd,
        status: p.status,
        provider: p.provider ?? null,
        providerReference: p.providerReference ?? null,
        confirmedAt: p.confirmedAt?.toISOString() ?? null,
        confirmedByName: p.confirmedBy?.name ?? p.confirmedBy?.phone ?? null,
        confirmationNote: p.confirmationNote ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getInvoices(query: AdminInvoiceQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const andConditions: Prisma.InvoiceWhereInput[] = [];

    if (query.status) {
      andConditions.push({ status: query.status as InvoiceStatus });
    }
    if (query.from || query.to) {
      const issuedAt: Prisma.DateTimeFilter = {};
      if (query.from) issuedAt.gte = new Date(query.from);
      if (query.to) issuedAt.lte = new Date(query.to);
      andConditions.push({ issuedAt });
    }
    if (query.missingEmail) {
      andConditions.push({
        OR: [
          { customerEmail: null },
          { customerEmail: '' },
        ],
      });
    }
    if (query.q) {
      const q = query.q.trim();
      andConditions.push({
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerEmail: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.InvoiceWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          order: true,
        },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    type InvoiceWithRelations = Invoice & {
      order: Order;
    };

    const items: AdminInvoiceItemDto[] = (invoices as InvoiceWithRelations[]).map((inv) => {
      const rawId = inv.orderId.replace(/-/g, '');
      const suffix = rawId.slice(-4).toUpperCase();
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderId: inv.orderId,
        orderCode: `LP-${suffix}`,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail ?? null,
        customerTaxCode: inv.customerTaxCode ?? null,
        customerAddress: inv.customerAddress ?? null,
        amountVnd: inv.amountVnd,
        vatRateVnd: inv.vatRateVnd,
        totalVnd: inv.totalVnd,
        status: inv.status,
        issuedAt: inv.issuedAt.toISOString(),
        emailSentAt: inv.emailSentAt?.toISOString() ?? null,
        isMissingEmail: !inv.customerEmail || inv.customerEmail.trim() === '',
        createdAt: inv.createdAt.toISOString(),
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getAuditEntries(query: AdminAuditQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [total, auditLogs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          actor: {
            select: { id: true, name: true, phone: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type AuditWithRelations = AuditLog & {
      actor: { id: string; name: string | null; phone: string | null; role: string } | null;
    };

    const items: AdminAuditEntryDto[] = (auditLogs as AuditWithRelations[]).map((entry) => ({
      id: entry.id,
      actorId: entry.actorId ?? null,
      actorName: entry.actor?.name ?? entry.actor?.phone ?? null,
      actorRole: entry.actor?.role ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      requestId: entry.requestId ?? null,
      idempotencyRequestId: entry.idempotencyRequestId ?? null,
      metadata: entry.metadata ?? null,
      createdAt: entry.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getPromotions(query: AdminPromotionQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PromotionVoucherWhereInput = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.discountType) {
      where.discountType = query.discountType as PromotionDiscountType;
    }
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, vouchers] = await Promise.all([
      this.prisma.promotionVoucher.count({ where }),
      this.prisma.promotionVoucher.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items: AdminPromotionItemDto[] = vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      title: v.title,
      description: v.description ?? null,
      discountType: v.discountType,
      discountValue: v.discountValue,
      maxDiscountVnd: v.maxDiscountVnd ?? null,
      minOrderAmountVnd: v.minOrderAmountVnd,
      usageLimit: v.usageLimit ?? null,
      usageCount: v.usageCount,
      expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
      isActive: v.isActive,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getReports(query: AdminReportQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const andConditions: Prisma.SupportTicketWhereInput[] = [];

    if (query.status) {
      andConditions.push({ status: query.status as SupportTicketStatus });
    }
    if (query.category) {
      andConditions.push({ category: query.category });
    }
    if (query.orderId) {
      andConditions.push({ orderId: query.orderId });
    }
    if (query.from || query.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.from) createdAt.gte = new Date(query.from);
      if (query.to) createdAt.lte = new Date(query.to);
      andConditions.push({ createdAt });
    }
    if (query.q) {
      const q = query.q.trim();
      const orConditions: Prisma.SupportTicketWhereInput[] = [
        { description: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
      ];
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
        orConditions.push({ orderId: q }, { id: q });
      }
      andConditions.push({ OR: orConditions });
    }

    const where: Prisma.SupportTicketWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customer: true,
          order: {
            include: {
              driver: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type SupportTicketWithRelations = SupportTicket & {
      customer: User;
      order: (Order & { driver: User | null }) | null;
    };

    const items: AdminReportItemDto[] = (tickets as SupportTicketWithRelations[]).map((t) => {
      const rawTicketId = t.id.replace(/-/g, '');
      const ticketSuffix = rawTicketId.slice(-6).toUpperCase();
      const ticketNumber = `TK-${ticketSuffix}`;

      let orderCode: string | null = null;
      if (t.orderId) {
        const rawOrderId = t.orderId.replace(/-/g, '');
        orderCode = `LP-${rawOrderId.slice(-4).toUpperCase()}`;
      }

      return {
        id: t.id,
        ticketNumber,
        orderId: t.orderId ?? null,
        orderCode,
        customerId: t.customerId,
        customerName: t.customer?.name ?? t.customer?.phone ?? 'Khách hàng',
        customerPhone: t.customer?.phone ?? null,
        driverId: t.order?.driver?.id ?? t.order?.driverId ?? null,
        driverName: t.order?.driver?.name ?? t.order?.driver?.phone ?? null,
        category: t.category,
        description: t.description,
        hasPhoto: t.hasPhoto,
        status: t.status as SupportTicketStatus,
        severity: calculateReportSeverity(t.category, t.status as SupportTicketStatus),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getReportDetail(id: string): Promise<AdminReportDetailDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        customer: true,
        order: {
          include: {
            driver: true,
            stops: { orderBy: { sequence: 'asc' } },
            trackingPoints: { take: 10, orderBy: { capturedAt: 'desc' } },
          },
        },
      },
    });

    if (!ticket) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy báo cáo khiếu nại');
    }

    type DetailedTicket = SupportTicket & {
      customer: User;
      order: (Order & {
        driver: User | null;
        stops: Array<{ address: string; sequence: number }>;
        trackingPoints: Array<{ capturedAt: Date }>;
      }) | null;
    };

    const t = ticket as DetailedTicket;

    const rawTicketId = t.id.replace(/-/g, '');
    const ticketSuffix = rawTicketId.slice(-6).toUpperCase();
    const ticketNumber = `TK-${ticketSuffix}`;

    let orderCode: string | null = null;
    if (t.orderId) {
      const rawOrderId = t.orderId.replace(/-/g, '');
      orderCode = `LP-${rawOrderId.slice(-4).toUpperCase()}`;
    }

    const ticketDto: AdminReportItemDto = {
      id: t.id,
      ticketNumber,
      orderId: t.orderId ?? null,
      orderCode,
      customerId: t.customerId,
      customerName: t.customer?.name ?? t.customer?.phone ?? 'Khách hàng',
      customerPhone: t.customer?.phone ?? null,
      driverId: t.order?.driver?.id ?? t.order?.driverId ?? null,
      driverName: t.order?.driver?.name ?? t.order?.driver?.phone ?? null,
      category: t.category,
      description: t.description,
      hasPhoto: t.hasPhoto,
      status: t.status as SupportTicketStatus,
      severity: calculateReportSeverity(t.category, t.status as SupportTicketStatus),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };

    const orderInfo = t.order
      ? {
          id: t.order.id,
          code: orderCode ?? '',
          status: t.order.status,
          originAddress: t.order.stops?.[0]?.address ?? null,
          destinationAddress: t.order.stops?.[t.order.stops.length - 1]?.address ?? null,
          priceVnd: t.order.priceVnd ?? 0,
          incidentReason: t.order.incidentReason ?? null,
          incidentNote: t.order.incidentNote ?? null,
          incidentReportedAt: t.order.incidentReportedAt?.toISOString() ?? null,
          createdAt: t.order.createdAt.toISOString(),
        }
      : null;

    const trackingSummary = t.order
      ? {
          lastPointCapturedAt: t.order.trackingPoints?.[0]?.capturedAt?.toISOString() ?? null,
          totalPoints: t.order.trackingPoints?.length ?? 0,
        }
      : null;

    return {
      ticket: ticketDto,
      order: orderInfo,
      customer: {
        id: t.customer.id,
        name: t.customer.name ?? null,
        phone: t.customer.phone ?? '',
      },
      driver: t.order?.driver
        ? {
            id: t.order.driver.id,
            name: t.order.driver.name ?? null,
            phone: t.order.driver.phone ?? '',
          }
        : null,
      trackingSummary,
    };
  }

  async getReviews(query: AdminReviewQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const andConditions: Prisma.OrderReviewWhereInput[] = [];

    if (query.minRating !== undefined || query.maxRating !== undefined) {
      const ratingFilter: Prisma.IntFilter = {};
      if (query.minRating !== undefined) ratingFilter.gte = query.minRating;
      if (query.maxRating !== undefined) ratingFilter.lte = query.maxRating;
      andConditions.push({ rating: ratingFilter });
    }

    if (query.driverId) {
      andConditions.push({ order: { driverId: query.driverId } });
    }

    if (query.customerId) {
      andConditions.push({ customerId: query.customerId });
    }

    if (query.from || query.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.from) createdAt.gte = new Date(query.from);
      if (query.to) createdAt.lte = new Date(query.to);
      andConditions.push({ createdAt });
    }

    if (query.q) {
      const q = query.q.trim();
      const orConditions: Prisma.OrderReviewWhereInput[] = [
        { comment: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
      ];
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
        orConditions.push({ orderId: q }, { id: q });
      } else {
        orConditions.push({ order: { clientRequestId: { contains: q, mode: 'insensitive' } } });
      }
      andConditions.push({ OR: orConditions });
    }

    const where: Prisma.OrderReviewWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, reviews] = await Promise.all([
      this.prisma.orderReview.count({ where }),
      this.prisma.orderReview.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customer: true,
          order: {
            include: {
              driver: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type OrderReviewWithRelations = OrderReview & {
      customer: User;
      order: Order & { driver: User | null };
    };

    const items: AdminReviewItemDto[] = (reviews as OrderReviewWithRelations[]).map((r) => {
      const rawOrderId = r.orderId.replace(/-/g, '');
      const orderCode = `LP-${rawOrderId.slice(-4).toUpperCase()}`;

      return {
        id: r.id,
        orderId: r.orderId,
        orderCode,
        customerId: r.customerId,
        customerName: r.customer?.name ?? r.customer?.phone ?? 'Khách hàng',
        customerPhone: maskCustomerPhone(r.customer?.phone),
        driverId: r.order?.driver?.id ?? r.order?.driverId ?? null,
        driverName: r.order?.driver?.name ?? r.order?.driver?.phone ?? null,
        driverPhone: r.order?.driver?.phone ? maskCustomerPhone(r.order.driver.phone) : null,
        rating: r.rating,
        comment: r.comment ?? null,
        tipVnd: r.tipVnd,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getDispatchExceptions(query: AdminDispatchQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const andConditions: Prisma.OrderWhereInput[] = [
      { status: 'REQUESTED' as OrderStatus, driverId: null },
    ];

    if (query.vehicleType) {
      andConditions.push({ vehicleType: query.vehicleType as VehicleType });
    }

    if (query.q) {
      const q = query.q.trim();
      const orConditions: Prisma.OrderWhereInput[] = [
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
        { stops: { some: { address: { contains: q, mode: 'insensitive' } } } },
      ];
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
        orConditions.push({ id: q });
      } else {
        orConditions.push({ clientRequestId: { contains: q, mode: 'insensitive' } });
      }
      andConditions.push({ OR: orConditions });
    }

    const where: Prisma.OrderWhereInput = { AND: andConditions };

    const [total, orders, availableDrivers] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customer: true,
          stops: { orderBy: { sequence: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.driverProfile.findMany({
        where: {
          availability: 'AVAILABLE',
          user: { status: 'ACTIVE', role: 'DRIVER' },
        },
        include: {
          user: true,
        },
      }),
    ]);

    type OrderWithStopsAndCustomer = Order & {
      customer: User;
      stops: Array<{ id: string; type: string; sequence: number; address: string }>;
    };

    const now = Date.now();

    const items: AdminDispatchExceptionItemDto[] = (orders as OrderWithStopsAndCustomer[]).map((o) => {
      const rawOrderId = o.id.replace(/-/g, '');
      const orderCode = `LP-${rawOrderId.slice(-4).toUpperCase()}`;
      const pickup = o.stops.find((s) => s.type === 'PICKUP');
      const dropoff = [...o.stops].reverse().find((s) => s.type === 'DROPOFF');

      const matchingDrivers: AdminDispatchCandidateDriverDto[] = availableDrivers
        .filter((d) => d.vehicleType === o.vehicleType)
        .map((d) => ({
          driverId: d.userId,
          driverName: d.user?.name ?? d.user?.phone ?? 'Tài xế',
          driverPhone: d.user?.phone ?? '',
          vehicleType: d.vehicleType,
        }));

      const waitingMinutes = Math.max(0, Math.floor((now - o.createdAt.getTime()) / 60000));

      return {
        orderId: o.id,
        orderCode,
        customerName: o.customer?.name ?? o.customer?.phone ?? 'Khách hàng',
        customerPhone: o.customer?.phone ?? '',
        vehicleType: o.vehicleType,
        status: o.status as OrderStatus,
        pickupAddress: pickup?.address ?? '',
        dropoffAddress: dropoff?.address ?? '',
        waitingMinutes,
        candidateDrivers: matchingDrivers,
        createdAt: o.createdAt.toISOString(),
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getBroadcastHistory(query: AdminBroadcastQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      action: 'NOTIFICATION_BROADCAST',
    };

    const [total, auditLogs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          actor: {
            select: { id: true, name: true, phone: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type AuditWithActor = AuditLog & {
      actor: { id: string; name: string | null; phone: string | null; role: string } | null;
    };

    let items: AdminBroadcastLogItemDto[] = (auditLogs as AuditWithActor[]).map((entry) => {
      const meta = (entry.metadata ?? {}) as Record<string, any>;
      return {
        id: entry.id,
        audience: (meta.audience as string) ?? 'ALL',
        title: (meta.title as string) ?? '',
        body: (meta.body as string) ?? '',
        sentCount: typeof meta.count === 'number' ? meta.count : 0,
        createdAt: entry.createdAt.toISOString(),
        createdByName: entry.actor?.name ?? entry.actor?.phone ?? 'Quản trị viên',
      };
    });

    if (query.q) {
      const qLower = query.q.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(qLower) ||
          item.body.toLowerCase().includes(qLower) ||
          item.audience.toLowerCase().includes(qLower) ||
          item.createdByName.toLowerCase().includes(qLower),
      );
    }

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getPricingConfig(): Promise<AdminPricingConfigDto> {
    const latestAudit = await this.prisma.auditLog.findFirst({
      where: {
        action: 'PRICING_CONFIG_UPDATE',
        resourceType: 'SYSTEM_CONFIG',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actor: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (latestAudit && latestAudit.metadata) {
      const meta = latestAudit.metadata as any;
      const config = meta.newConfig ?? meta;
      return {
        minimumFareVnd: config.minimumFareVnd,
        stopSurchargeVnd: config.stopSurchargeVnd,
        vehicleRates: config.vehicleRates,
        updatedAt: latestAudit.createdAt.toISOString(),
        updatedByName: latestAudit.actor?.name ?? latestAudit.actor?.phone ?? undefined,
      };
    }

    return {
      minimumFareVnd: DEFAULT_PRICING_CONFIG.minimumFareVnd,
      stopSurchargeVnd: DEFAULT_PRICING_CONFIG.stopSurchargeVnd,
      vehicleRates: DEFAULT_PRICING_CONFIG.vehicleRates,
    };
  }

  async getSupportConversations(query: AdminSupportQuery): Promise<{
    items: AdminSupportConversationDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const whereClause: Prisma.OrderWhereInput = {};
    if (query.q) {
      const q = query.q.trim();
      whereClause.OR = [
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
        { driver: { name: { contains: q, mode: 'insensitive' } } },
        { driver: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: whereClause }),
      this.prisma.order.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, name: true, phone: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    type OrderWithSupportRelations = Order & {
      customer: { id: string; name: string | null; phone: string };
      driver: { id: string; name: string | null; phone: string } | null;
      messages: { id: string; body: string; createdAt: Date }[];
    };

    const items: AdminSupportConversationDto[] = (orders as unknown as OrderWithSupportRelations[]).map((o) => {
      const rawId = o.id.replace(/-/g, '');
      const orderCode = `LP-${rawId.slice(-4).toUpperCase()}`;
      const lastMsg = o.messages[0];
      return {
        orderId: o.id,
        orderCode,
        orderStatus: o.status,
        customerId: o.customer.id,
        customerName: o.customer.name ?? 'Khách hàng',
        customerPhone: o.customer.phone,
        driverId: o.driver?.id ?? null,
        driverName: o.driver?.name ?? null,
        driverPhone: o.driver?.phone ?? null,
        lastMessageSnippet: lastMsg?.body ?? 'Chưa có tin nhắn hội thoại',
        lastMessageAt: lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : o.updatedAt.toISOString(),
        unreadCount: 0,
        status: o.status === 'DELIVERED' || o.status === 'CANCELLED' ? 'RESOLVED' : 'ACTIVE',
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getSupportMessages(orderId: string): Promise<AdminSupportMessageDto[]> {
    const messages = await this.prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      orderId: m.orderId,
      senderId: m.senderId,
      senderName: (m as any).sender?.name ?? 'Người dùng',
      senderRole: ((m as any).sender?.role as any) ?? 'CUSTOMER',
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }));
  }
}

function maskCustomerPhone(phone?: string | null): string {
  if (!phone) return '•••';
  const clean = phone.trim();
  if (clean.length < 4) return '•••';
  return `••• ${clean.slice(-4)}`;
}

function calculateReportSeverity(category: string, status?: SupportTicketStatus): 'CRITICAL' | 'MEDIUM' | 'LOW' {
  const cat = (category || '').toUpperCase();
  if (
    cat.includes('DAMAGE') ||
    cat.includes('LOST') ||
    cat.includes('ACCIDENT') ||
    cat.includes('SAFETY') ||
    cat.includes('THEFT') ||
    cat.includes('CRITICAL') ||
    cat.includes('EMERGENCY') ||
    cat.includes('INCIDENT')
  ) {
    return 'CRITICAL';
  }
  if (
    cat.includes('DELAY') ||
    cat.includes('PAYMENT') ||
    cat.includes('BEHAVIOR') ||
    cat.includes('DRIVER') ||
    cat.includes('WRONG') ||
    cat.includes('PRICE') ||
    cat.includes('ROUTE') ||
    cat.includes('DISPUTE')
  ) {
    return 'MEDIUM';
  }
  return 'LOW';
}
