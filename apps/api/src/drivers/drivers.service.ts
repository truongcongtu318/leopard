import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { mapOrderResponse, type MappedOrderResponse } from '../orders/order-response.mapper.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { DriversRepository } from './drivers.repository.js';
import { WithdrawalsRepository } from './withdrawals.repository.js';
import type { RequestWithdrawalDto } from './dto/request-withdrawal.dto.js';
import type { UpdateBankAccountDto } from './dto/update-bank-account.dto.js';
import type { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import type { UpdateDriverLocationDto } from './dto/update-driver-location.dto.js';

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly withdrawalsRepository: WithdrawalsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async updateAvailability(
    actor: AuthenticatedActor,
    dto: UpdateAvailabilityDto,
  ): Promise<{ availability: string }> {
    if (dto.availability === 'BUSY') {
      throw new DomainError(
        'BAD_REQUEST',
        400,
        'Lái xe không thể tự chuyển sang trạng thái BUSY thủ công',
      );
    }

    if (dto.availability !== 'AVAILABLE' && dto.availability !== 'OFFLINE') {
      throw new DomainError(
        'BAD_REQUEST',
        400,
        'Trạng thái sẵn sàng phải là AVAILABLE hoặc OFFLINE',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.availability === 'AVAILABLE') {
        const driver = await tx.user.findUnique({ where: { id: actor.userId } });
        if (!driver || driver.status !== 'ACTIVE') {
          throw new DomainError(
            'DRIVER_NOT_APPROVED',
            403,
            'Tài khoản tài xế chưa được duyệt',
          );
        }

        const activeOrdersCount = await tx.order.count({
          where: {
            driverId: actor.userId,
            status: { in: ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT'] },
          },
        });

        if (activeOrdersCount > 0) {
          throw new DomainError('DRIVER_HAS_ACTIVE_ORDER', 409, 'Tài xế đang có đơn hàng hoạt động');
        }
      }

      return this.driversRepository.updateAvailability(
        actor.userId,
        dto.availability,
        dto.autoOfflineOnComplete,
        tx,
      );
    });

    return { availability: updated.availability };
  }

  async getAvailability(
    actor: AuthenticatedActor,
  ): Promise<{ availability: string }> {
    const profile = await this.driversRepository.findDriverProfileByUserId(actor.userId);
    return { availability: profile?.availability ?? 'OFFLINE' };
  }

  async getAvailableOrders(
    actor: AuthenticatedActor,
    page = 1,
    pageSize = 20,
    radiusKm?: number,
  ): Promise<{ items: MappedOrderResponse[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const profile = await this.driversRepository.findDriverProfileByUserId(actor.userId);
    const driverLocation = radiusKm
      ? await this.driversRepository.findDriverLastKnownLocation(actor.userId)
      : null;
    const result = await this.driversRepository.findAvailableOrders(
      page,
      pageSize,
      profile?.vehicleType,
      driverLocation ?? undefined,
      radiusKm,
    );

    return {
      items: result.items.map(mapOrderResponse),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  async updateLocation(
    actor: AuthenticatedActor,
    dto: UpdateDriverLocationDto,
  ): Promise<{ ok: true }> {
    await this.driversRepository.updateLocation(
      actor.userId,
      dto.lat,
      dto.lng,
      dto.isStationaryHeartbeat ?? false,
    );
    return { ok: true };
  }

  /** Completed/terminal orders for the driver history screen. */
  async getOrderHistory(
    actor: AuthenticatedActor,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: MappedOrderResponse[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const result = await this.ordersRepository.findDriverOrderHistory(actor.userId, page, pageSize);

    return {
      items: result.items.map(mapOrderResponse),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  async getWalletSummary(actor: AuthenticatedActor) {
    return this.withdrawalsRepository.getWalletSummary(actor.userId);
  }

  async getPerformanceSummary(actor: AuthenticatedActor) {
    return this.driversRepository.getPerformanceStats(actor.userId);
  }

  async requestWithdrawal(actor: AuthenticatedActor, dto: RequestWithdrawalDto) {
    if (dto.clientRequestId) {
      const existing = await this.withdrawalsRepository.findWithdrawalRequestByClientRequestId(
        actor.userId,
        dto.clientRequestId,
      );
      if (existing) return existing;
    }

    const summary = await this.withdrawalsRepository.getWalletSummary(actor.userId);
    if (dto.amountVnd > summary.availableBalanceVnd) {
      throw new DomainError(
        'INSUFFICIENT_BALANCE',
        409,
        `Số dư khả dụng (${summary.availableBalanceVnd.toLocaleString('vi-VN')}đ) không đủ để rút ${dto.amountVnd.toLocaleString('vi-VN')}đ`,
      );
    }

    return this.withdrawalsRepository.createWithdrawalRequest({
      driverId: actor.userId,
      amountVnd: dto.amountVnd,
      bankName: dto.bankName,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
      ...(dto.clientRequestId ? { clientRequestId: dto.clientRequestId } : {}),
    });
  }

  async updateBankAccount(actor: AuthenticatedActor, dto: UpdateBankAccountDto) {
    return this.withdrawalsRepository.updateBankAccount(actor.userId, {
      bankName: dto.bankName.trim(),
      bankAccountNumber: dto.bankAccountNumber.trim(),
      bankAccountName: dto.bankAccountName.trim().toUpperCase(),
    });
  }

  async getWithdrawalHistory(actor: AuthenticatedActor, page = 1, pageSize = 20) {
    return this.withdrawalsRepository.findDriverWithdrawalHistory(actor.userId, page, pageSize);
  }

  async getActiveOrder(
    actor: AuthenticatedActor,
  ): Promise<{ order: MappedOrderResponse | null; availability: string }> {
    const [order, profile] = await Promise.all([
      this.driversRepository.findActiveOrderByDriverId(actor.userId),
      this.driversRepository.findDriverProfileByUserId(actor.userId),
    ]);

    return {
      order: order ? mapOrderResponse(order) : null,
      availability: profile?.availability ?? 'OFFLINE',
    };
  }
}
