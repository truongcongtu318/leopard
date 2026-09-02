import { Injectable } from '@nestjs/common';
import type { DriverProfile, UserStatus } from '@prisma/client';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { ApplyDriverDto } from './dto/apply-driver.dto.js';

export interface DriverApplicationView {
  readonly status: UserStatus;
  readonly vehicleType: DriverProfile['vehicleType'] | null;
  readonly licensePlate: string | null;
  readonly licenseNumber: string | null;
  readonly submittedAt: string | null;
  readonly reviewedAt: string | null;
  readonly rejectionReason: string | null;
}

/**
 * Driver onboarding: a customer (or a previously rejected driver) submits vehicle
 * + license details, which moves the account to DRIVER / PENDING_APPROVAL. An admin
 * later approves (ACTIVE) or rejects (REJECTED) — see the admin review flow.
 */
@Injectable()
export class DriverApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(
    actor: AuthenticatedActor,
    dto: ApplyDriverDto,
  ): Promise<DriverApplicationView> {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
    });

    if (!user) {
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    if (user.role === 'DRIVER' && user.status === 'ACTIVE') {
      throw new DomainError(
        'DRIVER_ALREADY_ACTIVE',
        409,
        'Tài khoản đã là tài xế đang hoạt động',
      );
    }

    if (user.role === 'DRIVER' && user.status === 'PENDING_APPROVAL') {
      throw new DomainError(
        'DRIVER_APPLICATION_PENDING',
        409,
        'Hồ sơ tài xế đang chờ duyệt',
      );
    }

    // Only a customer (self-upgrade) or a previously rejected driver may apply.
    if (user.role !== 'CUSTOMER' && user.role !== 'DRIVER') {
      throw new DomainError(
        'DRIVER_APPLICATION_FORBIDDEN',
        403,
        'Vai trò hiện tại không thể đăng ký làm tài xế',
      );
    }

    const now = new Date();
    const profile = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { role: 'DRIVER', status: 'PENDING_APPROVAL', name: dto.name },
      });

      return tx.driverProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          vehicleType: dto.vehicleType,
          licensePlate: dto.licensePlate,
          licenseNumber: dto.licenseNumber,
          availability: 'OFFLINE',
          submittedAt: now,
        },
        update: {
          vehicleType: dto.vehicleType,
          licensePlate: dto.licensePlate,
          licenseNumber: dto.licenseNumber,
          availability: 'OFFLINE',
          submittedAt: now,
          reviewedAt: null,
          reviewedById: null,
          rejectionReason: null,
        },
      });
    });

    return this.toView('PENDING_APPROVAL', profile);
  }

  async getMyApplication(
    actor: AuthenticatedActor,
  ): Promise<DriverApplicationView> {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { driverProfile: true },
    });

    if (!user || !user.driverProfile) {
      throw new DomainError(
        'RESOURCE_NOT_FOUND',
        404,
        'Chưa có hồ sơ tài xế',
      );
    }

    return this.toView(user.status, user.driverProfile);
  }

  private toView(
    status: UserStatus,
    profile: DriverProfile,
  ): DriverApplicationView {
    return {
      status,
      vehicleType: profile.vehicleType,
      licensePlate: profile.licensePlate,
      licenseNumber: profile.licenseNumber,
      submittedAt: profile.submittedAt?.toISOString() ?? null,
      reviewedAt: profile.reviewedAt?.toISOString() ?? null,
      rejectionReason: profile.rejectionReason,
    };
  }
}
