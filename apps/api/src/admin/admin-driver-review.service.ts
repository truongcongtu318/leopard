import { Injectable } from '@nestjs/common';
import type { DriverDocumentType, DriverProfile, User, UserStatus } from '@prisma/client';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  DriverContractService,
  type AdminDriverContractView,
} from '../drivers/driver-contract.service.js';

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
    private readonly driverContractService: DriverContractService,
  ) {}

  /** Admin: signed contract evidence (metadata + short-lived URLs) for one driver. */
  getContractEvidence(userId: string): Promise<AdminDriverContractView> {
    return this.driverContractService.getSignedContractForAdmin(userId);
  }

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
    if (clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: clientRequestId },
      });
      if (existing) return;
    }

    const driver = await this.requirePendingDriver(userId);

    // Enforce KYC documents gate: LICENSE, VEHICLE_REGISTRATION, ID_CARD
    if (this.prisma.driverDocument) {
      const uploadedDocs = await this.prisma.driverDocument.findMany({
        where: { driverProfileId: driver.driverProfile!.id },
        select: { type: true },
      });
      const uploadedTypes = new Set(uploadedDocs.map((d) => d.type));
      const REQUIRED_KYC_TYPES: DriverDocumentType[] = ['LICENSE', 'VEHICLE_REGISTRATION', 'ID_CARD'];
      const missingDocs = REQUIRED_KYC_TYPES.filter((t) => !uploadedTypes.has(t));
      if (missingDocs.length > 0) {
        throw new DomainError(
          'KYC_DOCUMENTS_INCOMPLETE',
          422,
          `Tài xế chưa nộp đủ giấy tờ KYC bắt buộc: ${missingDocs.join(', ')}`,
        );
      }
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: clientRequestId },
        });
        if (existing) return;
      }

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

    if (clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: clientRequestId },
      });
      if (existing) return;
    }

    await this.requirePendingDriver(userId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: clientRequestId },
        });
        if (existing) return;
      }

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

  async requestChanges(
    actor: AuthenticatedActor,
    userId: string,
    reason: string,
    documentId?: string,
    reasonCode?: string,
    clientRequestId?: string,
  ): Promise<void> {
    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      throw new DomainError(
        'VALIDATION_ERROR',
        422,
        'Lý do yêu cầu bổ sung phải từ 5 đến 500 ký tự',
      );
    }

    if (clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: clientRequestId },
      });
      if (existing) return;
    }

    const driver = await this.requirePendingDriver(userId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: clientRequestId },
        });
        if (existing) return;
      }

      await tx.driverProfile.update({
        where: { userId },
        data: {
          reviewedAt: now,
          reviewedById: actor.userId,
          rejectionReason: trimmed,
        },
      });

      if (documentId) {
        await tx.driverDocument.updateMany({
          where: { id: documentId, driverProfileId: driver.driverProfile!.id },
          data: {
            reviewStatus: 'ACTION_REQUIRED',
            reasonCode: reasonCode ?? 'ACTION_REQUIRED',
            reviewedById: actor.userId,
            reviewedAt: now,
          },
        });
      }

      await tx.driverApplication.updateMany({
        where: { userId, status: 'SUBMITTED' },
        data: {
          status: 'ACTION_REQUIRED',
          rejectionReason: trimmed,
          decisionReasonCode: reasonCode ?? 'ACTION_REQUIRED',
          reviewedAt: now,
          reviewedById: actor.userId,
        },
      });

      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'REQUEST_CHANGES_DRIVER',
          resourceType: 'User',
          resourceId: userId,
          ...(clientRequestId ? { idempotencyRequestId: clientRequestId } : {}),
          metadata: { toStatus: 'ACTION_REQUIRED', reason: trimmed, documentId, reasonCode },
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

    return user as DriverWithProfile;
  }
}
