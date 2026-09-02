import { Injectable } from '@nestjs/common';
import type { DriverProfile, User, UserStatus } from '@prisma/client';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

export interface DriverApplicationSummary {
  readonly userId: string;
  readonly name: string | null;
  readonly phone: string | null;
  readonly status: UserStatus;
  readonly vehicleType: DriverProfile['vehicleType'] | null;
  readonly licensePlate: string | null;
  readonly licenseNumber: string | null;
  readonly submittedAt: string | null;
  readonly rejectionReason: string | null;
}

type DriverWithProfile = User & { driverProfile: DriverProfile | null };

/** Admin review of driver onboarding applications (approve / reject). */
@Injectable()
export class AdminDriverReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listApplications(
    status: UserStatus = 'PENDING_APPROVAL',
  ): Promise<DriverApplicationSummary[]> {
    const users = await this.prisma.user.findMany({
      where: { role: 'DRIVER', status },
      include: { driverProfile: true },
      orderBy: { updatedAt: 'desc' },
    });

    return users.map((user: DriverWithProfile) => ({
      userId: user.id,
      name: user.name,
      phone: user.phone,
      status: user.status,
      vehicleType: user.driverProfile?.vehicleType ?? null,
      licensePlate: user.driverProfile?.licensePlate ?? null,
      licenseNumber: user.driverProfile?.licenseNumber ?? null,
      submittedAt: user.driverProfile?.submittedAt?.toISOString() ?? null,
      rejectionReason: user.driverProfile?.rejectionReason ?? null,
    }));
  }

  async approve(
    actor: AuthenticatedActor,
    userId: string,
    clientRequestId?: string,
  ): Promise<void> {
    await this.requirePendingDriver(userId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
      await tx.driverProfile.update({
        where: { userId },
        data: { reviewedAt: now, reviewedById: actor.userId, rejectionReason: null },
      });
      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'APPROVE_DRIVER',
          resourceType: 'User',
          resourceId: userId,
          ...(clientRequestId ? { idempotencyRequestId: clientRequestId } : {}),
          metadata: { toStatus: 'ACTIVE' },
        },
        tx,
      );
    });
  }

  async reject(
    actor: AuthenticatedActor,
    userId: string,
    reason: string,
    clientRequestId?: string,
  ): Promise<void> {
    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      throw new DomainError(
        'VALIDATION_ERROR',
        422,
        'Lý do từ chối phải từ 5 đến 500 ký tự',
      );
    }

    await this.requirePendingDriver(userId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: 'REJECTED' },
      });
      await tx.driverProfile.update({
        where: { userId },
        data: {
          reviewedAt: now,
          reviewedById: actor.userId,
          rejectionReason: trimmed,
        },
      });
      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'REJECT_DRIVER',
          resourceType: 'User',
          resourceId: userId,
          ...(clientRequestId ? { idempotencyRequestId: clientRequestId } : {}),
          metadata: { toStatus: 'REJECTED', reason: trimmed },
        },
        tx,
      );
    });
  }

  private async requirePendingDriver(userId: string): Promise<DriverWithProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    });

    if (!user || user.role !== 'DRIVER' || !user.driverProfile) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hồ sơ tài xế');
    }

    if (user.status !== 'PENDING_APPROVAL') {
      throw new DomainError(
        'DRIVER_APPLICATION_NOT_PENDING',
        409,
        'Hồ sơ tài xế không ở trạng thái chờ duyệt',
      );
    }

    return user;
  }
}
