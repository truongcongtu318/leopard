import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Role, UserStatus } from '@prisma/client';

import { DriverApplicationService } from './driver-application.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

interface FakeUser {
  id: string;
  role: Role;
  status: UserStatus;
  phone?: string | null;
  driverProfile?: FakeProfile | null;
}

interface FakeProfile {
  id: string;
  userId: string;
  vehicleType: string;
  licensePlate: string | null;
  licenseNumber: string | null;
  availability: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  contractVersion: string | null;
  contractSignedAt: Date | null;
}

interface FakeContract {
  driverProfileId: string;
  version: string;
  pdfStorageKey: string;
  signatureStorageKey: string | null;
  signedByName: string;
  signedAt: Date;
}

const actor: AuthenticatedActor = {
  userId: 'user-1',
  role: 'CUSTOMER',
  sessionId: 'session-1',
};

const validDto = {
  name: 'Nguyễn Văn A',
  vehicleType: 'VAN' as const,
  licensePlate: '59D-123.45',
  licenseNumber: 'GPLX-0001',
  contractAccepted: true,
};

const PREPARED = {
  signedByName: 'Nguyễn Văn A',
  signedAt: new Date('2026-09-05T10:00:00.000Z'),
  pdfStorageKey: 'contracts/profile-x/pdf/new.pdf',
  signatureStorageKey: null as string | null,
};

function createDriverContractServiceMock(prepared = PREPARED) {
  return {
    prepareSignedContract: jest.fn(async () => prepared),
    persistSignedContract: jest.fn(async () => ({})),
    cleanupUploaded: jest.fn(async () => undefined),
    deleteSupersededFiles: jest.fn(async () => undefined),
  };
}

function createPrismaMock(user: FakeUser | null) {
  const profiles = new Map<string, FakeProfile>();
  const contracts = new Map<string, FakeContract>();

  const tx = {
    user: { update: jest.fn(async () => user) },
    driverProfile: {
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { userId: string };
          create: Partial<FakeProfile> & { id: string };
          update: Partial<FakeProfile>;
        }) => {
          const existing = [...profiles.values()].find((p) => p.userId === where.userId);
          const next: FakeProfile = existing
            ? { ...existing, ...update }
            : {
                id: create.id,
                userId: where.userId,
                vehicleType: 'MOTORBIKE',
                licensePlate: null,
                licenseNumber: null,
                availability: 'OFFLINE',
                submittedAt: null,
                reviewedAt: null,
                reviewedById: null,
                rejectionReason: null,
                contractVersion: null,
                contractSignedAt: null,
                ...create,
              };
          profiles.set(next.id, next);
          return next;
        },
      ),
    },
  };

  return {
    profiles,
    contracts,
    prisma: {
      user: {
        findUnique: jest.fn(async () => user),
      },
      driverProfile: {
        findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => {
          return [...profiles.values()].find((p) => p.userId === where.userId) ?? null;
        }),
      },
      driverContract: {
        findUnique: jest.fn(
          async ({
            where,
          }: {
            where: { driverProfileId_version: { driverProfileId: string; version: string } };
          }) => {
            const key = `${where.driverProfileId_version.driverProfileId}:${where.driverProfileId_version.version}`;
            return contracts.get(key) ?? null;
          },
        ),
      },
      $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      _tx: tx,
    },
  };
}

describe('DriverApplicationService', () => {
  let mock: ReturnType<typeof createPrismaMock>;
  let contractService: ReturnType<typeof createDriverContractServiceMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    contractService = createDriverContractServiceMock();
  });

  it('moves a customer to DRIVER / PENDING_APPROVAL and stores the vehicle details', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'CUSTOMER', status: 'ACTIVE', phone: '0900' });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    const view = await service.apply(actor, validDto);

    expect(view).toMatchObject({
      status: 'PENDING_APPROVAL',
      vehicleType: 'VAN',
      licensePlate: '59D-123.45',
      licenseNumber: 'GPLX-0001',
      rejectionReason: null,
      contractVersion: 'v1',
      contractSignedAt: PREPARED.signedAt.toISOString(),
    });
    expect(view.submittedAt).not.toBeNull();
    expect(mock.prisma._tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'DRIVER', status: 'PENDING_APPROVAL', name: 'Nguyễn Văn A' },
    });
    expect(contractService.prepareSignedContract).toHaveBeenCalledWith(
      expect.objectContaining({
        signature: undefined,
        partyDetails: expect.objectContaining({
          driverName: 'Nguyễn Văn A',
          driverPhone: '0900',
          vehicleTypeLabel: 'Xe van',
        }),
      }),
    );
    expect(contractService.persistSignedContract).toHaveBeenCalledWith(
      mock.prisma._tx,
      expect.objectContaining({ version: 'v1', prepared: PREPARED }),
    );
  });

  it('rejects an application when contractAccepted is false, without touching user/profile state', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'CUSTOMER', status: 'ACTIVE' });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    await expect(
      service.apply(actor, { ...validDto, contractAccepted: false }),
    ).rejects.toMatchObject({ code: 'CONTRACT_NOT_ACCEPTED', status: 422 });

    expect(mock.prisma.$transaction).not.toHaveBeenCalled();
    expect(contractService.prepareSignedContract).not.toHaveBeenCalled();
  });

  it('rejects an application when contractAccepted is missing, without touching user/profile state', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'CUSTOMER', status: 'ACTIVE' });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);
    const { contractAccepted: _omit, ...dtoWithoutAcceptance } = validDto;

    await expect(service.apply(actor, dtoWithoutAcceptance as never)).rejects.toMatchObject({
      code: 'CONTRACT_NOT_ACCEPTED',
    });
    expect(mock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an application when the account is already an active driver', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'DRIVER', status: 'ACTIVE' });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    await expect(service.apply(actor, validDto)).rejects.toMatchObject({
      code: 'DRIVER_ALREADY_ACTIVE',
    });
    expect(mock.prisma.$transaction).not.toHaveBeenCalled();
    expect(contractService.prepareSignedContract).not.toHaveBeenCalled();
  });

  it('rejects an application that is still pending review', async () => {
    mock = createPrismaMock({
      id: 'user-1',
      role: 'DRIVER',
      status: 'PENDING_APPROVAL',
    });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    await expect(service.apply(actor, validDto)).rejects.toMatchObject({
      code: 'DRIVER_APPLICATION_PENDING',
    });
  });

  it('lets a rejected driver re-apply, clears the previous rejection reason, and re-signs the same version', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'DRIVER', status: 'REJECTED', phone: '0900' });
    mock.profiles.set('profile-1', {
      id: 'profile-1',
      userId: 'user-1',
      vehicleType: 'MOTORBIKE',
      licensePlate: 'OLD',
      licenseNumber: 'OLD',
      availability: 'OFFLINE',
      submittedAt: new Date('2026-08-01T00:00:00.000Z'),
      reviewedAt: new Date('2026-08-02T00:00:00.000Z'),
      reviewedById: 'admin-1',
      rejectionReason: 'Ảnh giấy tờ mờ',
      contractVersion: 'v1',
      contractSignedAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    mock.contracts.set('profile-1:v1', {
      driverProfileId: 'profile-1',
      version: 'v1',
      pdfStorageKey: 'contracts/profile-1/pdf/old.pdf',
      signatureStorageKey: 'contracts/profile-1/signature/old.png',
      signedByName: 'Nguyễn Văn A',
      signedAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    const view = await service.apply(actor, validDto);

    expect(view.rejectionReason).toBeNull();
    expect(view.reviewedAt).toBeNull();
    expect(view.vehicleType).toBe('VAN');
    expect(view.contractVersion).toBe('v1');
    expect(mock.profiles.size).toBe(1); // same profile row updated, no duplicate
    expect(contractService.prepareSignedContract).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'profile-1' }),
    );
    expect(contractService.persistSignedContract).toHaveBeenCalledWith(
      mock.prisma._tx,
      expect.objectContaining({ driverProfileId: 'profile-1', version: 'v1' }),
    );
    expect(contractService.deleteSupersededFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        pdfStorageKey: 'contracts/profile-1/pdf/old.pdf',
        signatureStorageKey: 'contracts/profile-1/signature/old.png',
      }),
      PREPARED,
      { driverProfileId: 'profile-1', version: 'v1' },
    );
  });

  it('does not attempt superseded-file cleanup for a brand-new applicant (no prior contract)', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'CUSTOMER', status: 'ACTIVE' });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    await service.apply(actor, validDto);

    expect(contractService.deleteSupersededFiles).not.toHaveBeenCalled();
  });

  it('cleans up freshly-uploaded evidence when the transaction fails, and still throws the original error', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'CUSTOMER', status: 'ACTIVE' });
    mock.prisma.$transaction.mockRejectedValueOnce(new Error('db exploded'));
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    await expect(service.apply(actor, validDto)).rejects.toThrow('db exploded');

    expect(contractService.cleanupUploaded).toHaveBeenCalledWith(
      PREPARED,
      expect.objectContaining({ driverProfileId: expect.any(String), version: 'v1' }),
    );
    expect(contractService.deleteSupersededFiles).not.toHaveBeenCalled();
  });

  it('propagates SIGNATURE_INVALID from contract preparation without starting a transaction', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'CUSTOMER', status: 'ACTIVE' });
    contractService.prepareSignedContract.mockRejectedValueOnce(
      Object.assign(new Error('bad signature'), { code: 'SIGNATURE_INVALID', status: 422 }),
    );
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    await expect(service.apply(actor, validDto)).rejects.toMatchObject({
      code: 'SIGNATURE_INVALID',
    });
    expect(mock.prisma.$transaction).not.toHaveBeenCalled();
    expect(contractService.cleanupUploaded).not.toHaveBeenCalled();
  });

  it('returns 404 when reading an application that does not exist', async () => {
    mock = createPrismaMock({
      id: 'user-1',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      driverProfile: null,
    });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    await expect(service.getMyApplication(actor)).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('surfaces contractVersion/contractSignedAt on the application view', async () => {
    mock = createPrismaMock({
      id: 'user-1',
      role: 'DRIVER',
      status: 'PENDING_APPROVAL',
      driverProfile: {
        id: 'profile-1',
        userId: 'user-1',
        vehicleType: 'VAN',
        licensePlate: 'X',
        licenseNumber: 'Y',
        availability: 'OFFLINE',
        submittedAt: new Date('2026-09-01T00:00:00.000Z'),
        reviewedAt: null,
        reviewedById: null,
        rejectionReason: null,
        contractVersion: 'v1',
        contractSignedAt: new Date('2026-09-01T00:05:00.000Z'),
      },
    });
    const service = new DriverApplicationService(mock.prisma as never, contractService as never);

    const view = await service.getMyApplication(actor);

    expect(view.contractVersion).toBe('v1');
    expect(view.contractSignedAt).toBe('2026-09-01T00:05:00.000Z');
  });
});
