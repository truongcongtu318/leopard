import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AdminUpdateUserStatusCommand,
  AdminCreatePromotionDto,
  AdminUpdatePromotionDto,
  AdminResolveReportCommand,
  AdminHideReviewCommand,
  AdminReassignOrderCommand,
  AdminBroadcastCommand,
  AdminUpdatePricingCommand,
  AdminPricingConfigDto,
  AdminSendSupportMessageCommand,
  AdminSupportMessageDto,
} from '@leopard/shared';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import type {
  UserStatus,
  PromotionDiscountType,
  Prisma,
  PromotionVoucher,
  SupportTicketStatus,
  NotificationType,
} from '@prisma/client';
import { DEFAULT_PRICING_CONFIG } from '../maps/domain/pricing.service.js';

@Injectable()
export class AdminCommandService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async updateUserStatus(actor: AuthenticatedActor, userId: string, command: AdminUpdateUserStatusCommand): Promise<void> {
    if (userId === actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Không thể tự vô hiệu hóa tài khoản của chính mình');
    }
    const reason = command.reason?.trim() ?? '';
    if (reason.length < 5 || reason.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Lý do phải từ 5 đến 500 ký tự');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy người dùng');
    if (!['ACTIVE', 'DISABLED'].includes(command.status)) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Trạng thái không hợp lệ');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.auditLog.findFirst({
        where: { idempotencyRequestId: command.clientRequestId },
      });
      if (existing) return;

      await tx.user.update({ where: { id: userId }, data: { status: command.status as UserStatus } });
      await this.audit.append({
        actorId: actor.userId,
        action: 'UPDATE_USER_STATUS',
        resourceType: 'User',
        resourceId: userId,
        idempotencyRequestId: command.clientRequestId,
        metadata: { fromStatus: user.status, toStatus: command.status, reason },
      }, tx);
    });
  }

  async createPromotion(
    actor: AuthenticatedActor,
    dto: AdminCreatePromotionDto,
  ): Promise<PromotionVoucher> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.prisma.promotionVoucher.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new DomainError('CONFLICT', 409, `Mã khuyến mãi "${normalizedCode}" đã tồn tại`);
    }

    return this.prisma.$transaction(async (tx) => {
      const voucher = await tx.promotionVoucher.create({
        data: {
          code: normalizedCode,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          discountType: dto.discountType as PromotionDiscountType,
          discountValue: dto.discountValue,
          maxDiscountVnd: dto.maxDiscountVnd ?? null,
          minOrderAmountVnd: dto.minOrderAmountVnd ?? 0,
          usageLimit: dto.usageLimit ?? null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          isActive: true,
        },
      });

      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'PROMOTION_CREATED',
          resourceType: 'PromotionVoucher',
          resourceId: voucher.id,
          metadata: {
            code: voucher.code,
            title: voucher.title,
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
          },
        },
        tx,
      );

      return voucher;
    });
  }

  async updatePromotion(
    actor: AuthenticatedActor,
    id: string,
    dto: AdminUpdatePromotionDto,
  ): Promise<PromotionVoucher> {
    const existing = await this.prisma.promotionVoucher.findUnique({ where: { id } });
    if (!existing) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy mã khuyến mãi');
    }

    const newCode = dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined;
    if (newCode && newCode !== existing.code) {
      const duplicate = await this.prisma.promotionVoucher.findUnique({
        where: { code: newCode },
      });
      if (duplicate) {
        throw new DomainError('CONFLICT', 409, `Mã khuyến mãi "${newCode}" đã tồn tại`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.PromotionVoucherUpdateInput = {};
      if (newCode !== undefined) data.code = newCode;
      if (dto.title !== undefined) data.title = dto.title.trim();
      if (dto.description !== undefined) data.description = dto.description ? dto.description.trim() : null;
      if (dto.discountType !== undefined) data.discountType = dto.discountType as PromotionDiscountType;
      if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
      if (dto.maxDiscountVnd !== undefined) data.maxDiscountVnd = dto.maxDiscountVnd;
      if (dto.minOrderAmountVnd !== undefined) data.minOrderAmountVnd = dto.minOrderAmountVnd ?? 0;
      if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
      if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;

      const voucher = await tx.promotionVoucher.update({
        where: { id },
        data,
      });

      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'PROMOTION_UPDATED',
          resourceType: 'PromotionVoucher',
          resourceId: id,
          metadata: {
            previous: {
              code: existing.code,
              isActive: existing.isActive,
              discountValue: existing.discountValue,
            },
            updated: {
              code: voucher.code,
              isActive: voucher.isActive,
              discountValue: voucher.discountValue,
            },
            reason: dto.reason ?? null,
          },
        },
        tx,
      );

      return voucher;
    });
  }

  async resolveReport(
    actor: AuthenticatedActor,
    id: string,
    cmd: AdminResolveReportCommand,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy báo cáo khiếu nại');
    }

    if (cmd.resolution !== 'RESOLVED' && cmd.resolution !== 'CLOSED') {
      throw new DomainError('VALIDATION_ERROR', 422, 'Trạng thái xử lý không hợp lệ');
    }

    const note = cmd.note?.trim() ?? '';
    if (note.length < 5 || note.length > 1000) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Ghi chú xử lý phải từ 5 đến 1000 ký tự');
    }

    return this.prisma.$transaction(async (tx) => {
      if (cmd.clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: cmd.clientRequestId },
        });
        if (existing) {
          return ticket;
        }
      }

      const updated = await tx.supportTicket.update({
        where: { id },
        data: {
          status: cmd.resolution as SupportTicketStatus,
        },
      });

      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'REPORT_RESOLVED',
          resourceType: 'SupportTicket',
          resourceId: id,
          ...(cmd.clientRequestId ? { idempotencyRequestId: cmd.clientRequestId } : {}),
          metadata: {
            fromStatus: ticket.status,
            toStatus: cmd.resolution,
            note,
            orderId: ticket.orderId,
            customerId: ticket.customerId,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async hideReview(
    id: string,
    command: AdminHideReviewCommand,
    actorId: string,
  ) {
    const reason = command.reason?.trim() ?? '';
    if (reason.length < 5 || reason.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Lý do ẩn đánh giá phải từ 5 đến 500 ký tự');
    }

    const review = await this.prisma.orderReview.findUnique({ where: { id } });
    if (!review) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đánh giá');
    }

    return this.prisma.$transaction(async (tx) => {
      if (command.clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: command.clientRequestId },
        });
        if (existing) {
          return review;
        }
      }

      const updated = await tx.orderReview.update({
        where: { id },
        data: {
          comment: `[Đã ẩn bởi Quản trị viên: ${reason}]`,
        },
      });

      await this.audit.append(
        {
          actorId,
          action: 'HIDE_REVIEW',
          resourceType: 'ORDER_REVIEW',
          resourceId: id,
          ...(command.clientRequestId ? { idempotencyRequestId: command.clientRequestId } : {}),
          metadata: {
            reason,
            originalComment: review.comment,
            orderId: review.orderId,
            customerId: review.customerId,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async reassignOrder(
    orderId: string,
    command: AdminReassignOrderCommand,
    actor: AuthenticatedActor,
  ) {
    const reason = command.reason?.trim() ?? '';
    if (reason.length < 5 || reason.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Lý do điều phối phải từ 5 đến 500 ký tự');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { driver: true },
    });
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (command.clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: command.clientRequestId },
      });
      if (existing) {
        return order;
      }
    }

    if (order.status !== 'REQUESTED') {
      throw new DomainError('VALIDATION_ERROR', 422, `Đơn hàng không ở trạng thái chờ điều phối (hiện tại: ${order.status})`);
    }

    const driver = await this.prisma.user.findUnique({
      where: { id: command.driverId },
      include: { driverProfile: true },
    });
    if (!driver || driver.role !== 'DRIVER') {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy tài xế');
    }
    if (driver.status !== 'ACTIVE') {
      throw new DomainError('VALIDATION_ERROR', 422, 'Tài xế không ở trạng thái hoạt động');
    }

    return this.prisma.$transaction(async (tx) => {
      if (command.clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: command.clientRequestId },
        });
        if (existing) {
          return order;
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          driverId: command.driverId,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: 'REQUESTED',
          toStatus: 'ACCEPTED',
          actorId: actor.userId,
          clientRequestId: command.clientRequestId ?? null,
          reason,
        },
      });

      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'DISPATCH_MANUAL_REASSIGN',
          resourceType: 'ORDER',
          resourceId: orderId,
          ...(command.clientRequestId ? { idempotencyRequestId: command.clientRequestId } : {}),
          metadata: {
            driverId: command.driverId,
            reason,
            previousDriverId: order.driverId,
          },
        },
        tx,
      );

      await tx.driverProfile.update({
        where: { userId: command.driverId },
        data: { availability: 'BUSY' },
      });

      return updatedOrder;
    });
  }

  async broadcastNotification(
    command: AdminBroadcastCommand,
    actor: AuthenticatedActor,
  ): Promise<{ success: boolean; count: number; audience: string }> {
    const title = command.title?.trim() ?? '';
    if (title.length < 5 || title.length > 200) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Tiêu đề thông báo phải từ 5 đến 200 ký tự');
    }

    const body = command.body?.trim() ?? '';
    if (body.length < 10 || body.length > 2000) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Nội dung thông báo phải từ 10 đến 2000 ký tự');
    }

    const validAudiences = ['ALL', 'CUSTOMER', 'DRIVER'];
    if (!validAudiences.includes(command.audience)) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Đối tượng nhận thông báo không hợp lệ');
    }

    if (command.clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: command.clientRequestId },
      });
      if (existing) {
        const meta = (existing.metadata ?? {}) as any;
        return {
          success: true,
          count: meta?.count ?? 0,
          audience: command.audience,
        };
      }
    }

    const where: Prisma.UserWhereInput = {
      status: 'ACTIVE',
    };
    if (command.audience === 'CUSTOMER') {
      where.role = 'CUSTOMER';
    } else if (command.audience === 'DRIVER') {
      where.role = 'DRIVER';
    }

    const targetUsers = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });
    const userIds = targetUsers.map((u) => u.id);

    return this.prisma.$transaction(async (tx) => {
      if (command.clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: command.clientRequestId },
        });
        if (existing) {
          const meta = (existing.metadata ?? {}) as any;
          return {
            success: true,
            count: meta?.count ?? 0,
            audience: command.audience,
          };
        }
      }

      const notifType = (command.type ?? 'SYSTEM') as NotificationType;
      if (userIds.length > 0) {
        await tx.notification.createMany({
          data: userIds.map((userId) => ({
            userId,
            type: notifType,
            title,
            body,
            data: { broadcast: true, audience: command.audience },
          })),
        });
      }

      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'NOTIFICATION_BROADCAST',
          resourceType: 'NOTIFICATION',
          ...(command.clientRequestId ? { idempotencyRequestId: command.clientRequestId } : {}),
          metadata: {
            audience: command.audience,
            title,
            body,
            type: notifType,
            count: userIds.length,
          },
        },
        tx,
      );

      return {
        success: true,
        count: userIds.length,
        audience: command.audience,
      };
    });
  }

  async updatePricingConfig(
    command: AdminUpdatePricingCommand,
    actor: AuthenticatedActor,
  ): Promise<AdminPricingConfigDto> {
    const reason = command.reason?.trim() ?? '';
    if (reason.length < 5 || reason.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Lý do cập nhật bảng giá phải từ 5 đến 500 ký tự');
    }

    if (command.minimumFareVnd === undefined || command.minimumFareVnd < 0) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Giá cước tối thiểu không hợp lệ');
    }
    if (command.stopSurchargeVnd === undefined || command.stopSurchargeVnd < 0) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Phụ phí điểm dừng không hợp lệ');
    }
    if (!command.vehicleRates || Object.keys(command.vehicleRates).length === 0) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Cấu hình giá cước xe không được để trống');
    }

    for (const [vehicleType, rate] of Object.entries(command.vehicleRates)) {
      if (rate.baseFareVnd === undefined || rate.baseFareVnd < 0) {
        throw new DomainError('VALIDATION_ERROR', 422, `Giá mở cửa xe ${vehicleType} không hợp lệ`);
      }
      if (rate.perKmVnd === undefined || rate.perKmVnd < 0) {
        throw new DomainError('VALIDATION_ERROR', 422, `Giá mỗi km xe ${vehicleType} không hợp lệ`);
      }
      if (rate.loadingFeeVnd !== undefined && rate.loadingFeeVnd < 0) {
        throw new DomainError('VALIDATION_ERROR', 422, `Phí bốc xếp xe ${vehicleType} không hợp lệ`);
      }
    }

    const actorUser = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      select: { name: true, phone: true },
    });
    const updatedByName = actorUser?.name ?? actorUser?.phone ?? 'Quản trị viên';

    if (command.clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: command.clientRequestId },
      });
      if (existing) {
        const meta = (existing.metadata ?? {}) as any;
        const cfg = meta.newConfig ?? meta;
        return {
          minimumFareVnd: cfg.minimumFareVnd,
          stopSurchargeVnd: cfg.stopSurchargeVnd,
          vehicleRates: cfg.vehicleRates,
          updatedAt: existing.createdAt.toISOString(),
          updatedByName,
        };
      }
    }

    const previousAudit = await this.prisma.auditLog.findFirst({
      where: {
        action: 'PRICING_CONFIG_UPDATE',
        resourceType: 'SYSTEM_CONFIG',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const previousConfig = previousAudit?.metadata
      ? ((previousAudit.metadata as any).newConfig ?? previousAudit.metadata)
      : DEFAULT_PRICING_CONFIG;

    return this.prisma.$transaction(async (tx) => {
      if (command.clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: command.clientRequestId },
        });
        if (existing) {
          const meta = (existing.metadata ?? {}) as any;
          const cfg = meta.newConfig ?? meta;
          return {
            minimumFareVnd: cfg.minimumFareVnd,
            stopSurchargeVnd: cfg.stopSurchargeVnd,
            vehicleRates: cfg.vehicleRates,
            updatedAt: existing.createdAt.toISOString(),
            updatedByName,
          };
        }
      }

      const auditLog = await this.audit.append(
        {
          actorId: actor.userId,
          action: 'PRICING_CONFIG_UPDATE',
          resourceType: 'SYSTEM_CONFIG',
          ...(command.clientRequestId ? { idempotencyRequestId: command.clientRequestId } : {}),
          metadata: {
            previousConfig,
            newConfig: {
              minimumFareVnd: command.minimumFareVnd,
              stopSurchargeVnd: command.stopSurchargeVnd,
              vehicleRates: command.vehicleRates,
            },
            reason,
          },
        },
        tx,
      );

      return {
        minimumFareVnd: command.minimumFareVnd,
        stopSurchargeVnd: command.stopSurchargeVnd,
        vehicleRates: command.vehicleRates,
        updatedAt: auditLog.createdAt.toISOString(),
        updatedByName,
      };
    });
  }

  async sendSupportMessage(
    orderId: string,
    command: AdminSendSupportMessageCommand,
    actor: AuthenticatedActor,
  ): Promise<AdminSupportMessageDto> {
    const trimmed = command.body?.trim();
    if (!trimmed) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Nội dung tin nhắn không được để trống');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, customerId: true, driverId: true },
      });
      if (!order) {
        throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
      }

      const msg = await tx.orderMessage.create({
        data: {
          orderId,
          senderId: actor.userId,
          body: trimmed,
        },
      });

      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'SUPPORT_MESSAGE_SENT',
          resourceType: 'ORDER_MESSAGE',
          resourceId: msg.id,
          ...(command.clientRequestId ? { idempotencyRequestId: command.clientRequestId } : {}),
          metadata: {
            orderId,
            body: trimmed,
          },
        },
        tx,
      );

      return {
        id: msg.id,
        orderId: msg.orderId,
        senderId: msg.senderId,
        senderName: 'Ban Quản Trị LEOPARD',
        senderRole: 'ADMIN',
        body: msg.body,
        createdAt: msg.createdAt.toISOString(),
      };
    });
  }
}

