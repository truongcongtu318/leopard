import { Injectable } from '@nestjs/common';
import type { DriverProfile, UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { CONTRACT_VERSION, VEHICLE_TYPE_LABELS_VI } from './driver-contract-template.js';
import {
  DriverContractService,
  type PreparedSignedContract,
  type SupersededContractFiles,
} from './driver-contract.service.js';
import type { ApplyDriverDto } from './dto/apply-driver.dto.js';

export interface DriverApplicationView {
  readonly status: UserStatus;
  readonly vehicleType: DriverProfile['vehicleType'] | null;
  readonly licensePlate: string | null;
  readonly licenseNumber: string | null;
  readonly submittedAt: string | null;
  readonly reviewedAt: string | null;
  readonly rejectionReason: string | null;
  readonly contractVersion: string | null;
  readonly contractSignedAt: string | null;
}

interface ApplicableUser {
  readonly id: string;
  readonly phone: string | null;
}

interface ExistingContractContext {
  readonly profileId: string;
  readonly existingContract: SupersededContractFiles | null;
}

/**
 * Driver onboarding: a customer (or a previously rejected driver) submits vehicle
 * + license details, which moves the account to DRIVER / PENDING_APPROVAL. An admin
 * later approves (ACTIVE) or rejects (REJECTED) — see the admin review flow.
 *
 * Applying also requires signing the current driver contract (`contractAccepted`
 * + optional `signature`). Contract evidence (signature image + personalised
 * PDF) is uploaded *before* the transactional write, per the "no I/O inside a
 * DB transaction" rule — see `DriverContractService`.
 */
@Injectable()
export class DriverApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driverContractService: DriverContractService,
  ) {}

  async apply(
    actor: AuthenticatedActor,
    dto: ApplyDriverDto,
  ): Promise<DriverApplicationView> {
    const user = await this.loadApplicableUser(actor);
    this.assertContractAccepted(dto);

    const { profileId, existingContract } = await this.loadExistingContractContext(user.id);
    const prepared = await this.driverContractService.prepareSignedContract({
      profileId,
      signature: dto.signature,
      partyDetails: {
        driverName: dto.name,
        driverPhone: user.phone ?? '',
        vehicleTypeLabel: VEHICLE_TYPE_LABELS_VI[dto.vehicleType] ?? dto.vehicleType,
        licensePlate: dto.licensePlate,
        licenseNumber: dto.licenseNumber,
      },
    });

    let profile: DriverProfile;
    try {
      profile = await this.commitApplication(user.id, profileId, dto, prepared);
    } catch (error) {
      await this.driverContractService.cleanupUploaded(prepared);
      throw error;
    }

    if (existingContract) {
      await this.driverContractService.deleteSupersededFiles(existingContract, prepared, {
        driverProfileId: profileId,
        version: CONTRACT_VERSION,
      });
    }

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

  /** Loads the acting user and applies the existing role/status guard rules. */
  private async loadApplicableUser(actor: AuthenticatedActor): Promise<ApplicableUser> {
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

    return { id: user.id, phone: user.phone };
  }

  private assertContractAccepted(dto: ApplyDriverDto): void {
    if (dto.contractAccepted !== true) {
      throw new DomainError(
        'CONTRACT_NOT_ACCEPTED',
        422,
        'Bạn cần đồng ý với hợp đồng tài xế trước khi đăng ký',
      );
    }
  }

  /**
   * Resolves the driver profile id up-front (generating one for a brand-new
   * applicant) so contract evidence can be uploaded to a deterministic
   * storage path *before* the profile row exists, and looks up any contract
   * this re-application would supersede (for post-commit cleanup).
   */
  private async loadExistingContractContext(userId: string): Promise<ExistingContractContext> {
    const existingProfile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    const profileId = existingProfile?.id ?? randomUUID();

    const existingContract = existingProfile
      ? await this.prisma.driverContract.findUnique({
          where: {
            driverProfileId_version: { driverProfileId: profileId, version: CONTRACT_VERSION },
          },
        })
      : null;

    return { profileId, existingContract };
  }

  /** The single transactional write: user role/status, profile, contract row. */
  private commitApplication(
    userId: string,
    profileId: string,
    dto: ApplyDriverDto,
    prepared: PreparedSignedContract,
  ): Promise<DriverProfile> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: 'DRIVER', status: 'PENDING_APPROVAL', name: dto.name },
      });

      const now = new Date();
      const profile = await tx.driverProfile.upsert({
        where: { userId },
        create: {
          id: profileId,
          userId,
          vehicleType: dto.vehicleType,
          licensePlate: dto.licensePlate,
          licenseNumber: dto.licenseNumber,
          availability: 'OFFLINE',
          submittedAt: now,
          contractVersion: CONTRACT_VERSION,
          contractSignedAt: prepared.signedAt,
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
          contractVersion: CONTRACT_VERSION,
          contractSignedAt: prepared.signedAt,
        },
      });

      await this.driverContractService.persistSignedContract(tx, {
        driverProfileId: profileId,
        version: CONTRACT_VERSION,
        prepared,
      });

      return profile;
    });
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
      contractVersion: profile.contractVersion ?? null,
      contractSignedAt: profile.contractSignedAt?.toISOString() ?? null,
    };
  }
}
