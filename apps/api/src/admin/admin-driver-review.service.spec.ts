import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Role, UserStatus } from '@prisma/client';

import { AdminDriverReviewService } from './admin-driver-review.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

const admin: AuthenticatedActor = {
  userId: 'admin-1',
  role: 'ADMIN',
  sessionId: 'session-1',
};

interface FakeUser {
  id: string;
  name?: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  driverProfile?: {
    userId: string;
    vehicleType: string;
    licensePlate: string | null;
    licenseNumber: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewedById: string | null;
    rejectionReason: string | null;
  } | null;
}

function createMock(user: FakeUser | null, list: FakeUser[] = []) {
  const tx = {
    user: { update: jest.fn(async () => user) },
    driverProfile: { update: jest.fn(async () => user?.driverProfile) },
  };
  const audit = { append: jest.fn(async () => ({})) };

  const prisma = {
    user: {
      findUnique: jest.fn(async () => user),
      findMany: jest.fn(async () => list),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    _tx: tx,
  };

  return { prisma, audit, tx };
}

describe('AdminDriverReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists pending driver applications with vehicle details', async () => {
    const list: FakeUser[] = [
      {
        id: 'u-1',
        name: 'Nguyễn Văn A',
        phone: '+84900000002',
        role: 'DRIVER',
        status: 'PENDING_APPROVAL',
        driverProfile: {
          userId: 'u-1',
          vehicleType: 'VAN',
          licensePlate: '59D-123.45',
          licenseNumber: 'GPLX-1',
          submittedAt: new Date('2026-09-01T00:00:00.000Z'),
          reviewedAt: null,
          reviewedById: null,
          rejectionReason: null,
        },
      },
    ];
    const { prisma, audit } = createMock(null, list);
    const service = new AdminDriverReviewService(prisma as never, audit as never);

    const result = await service.listApplications();

    expect(result).toEqual([
      {
        userId: 'u-1',
        name: 'Nguyễn Văn A',
        phone: '+84900000002',
        status: 'PENDING_APPROVAL',
        vehicleType: 'VAN',
        licensePlate: '59D-123.45',
        licenseNumber: 'GPLX-1',
        submittedAt: '2026-09-01T00:00:00.000Z',
        rejectionReason: null,
      },
    ]);
  });

  it('approves a pending driver, activating the account and recording the review', async () => {
    const user: FakeUser = {
      id: 'u-1',
      phone: '+84900000002',
      role: 'DRIVER',
      status: 'PENDING_APPROVAL',
      driverProfile: {
        userId: 'u-1',
        vehicleType: 'VAN',
        licensePlate: 'X',
        licenseNumber: 'Y',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        rejectionReason: null,
      },
    };
    const { prisma, audit, tx } = createMock(user);
    const service = new AdminDriverReviewService(prisma as never, audit as never);

    await service.approve(admin, 'u-1');

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      data: { status: 'ACTIVE' },
    });
    expect(tx.driverProfile.update).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
      data: expect.objectContaining({ reviewedById: 'admin-1', rejectionReason: null }),
    });
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVE_DRIVER', resourceId: 'u-1' }),
      tx,
    );
  });

  it('rejects a pending driver with a reason', async () => {
    const user: FakeUser = {
      id: 'u-1',
      phone: '+84900000002',
      role: 'DRIVER',
      status: 'PENDING_APPROVAL',
      driverProfile: {
        userId: 'u-1',
        vehicleType: 'VAN',
        licensePlate: 'X',
        licenseNumber: 'Y',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        rejectionReason: null,
      },
    };
    const { prisma, tx } = createMock(user);
    const service = new AdminDriverReviewService(prisma as never, { append: jest.fn(async () => ({})) } as never);

    await service.reject(admin, 'u-1', 'Ảnh giấy tờ mờ, cần chụp lại');

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      data: { status: 'REJECTED' },
    });
    expect(tx.driverProfile.update).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
      data: expect.objectContaining({ rejectionReason: 'Ảnh giấy tờ mờ, cần chụp lại' }),
    });
  });

  it('rejects a too-short rejection reason with 422', async () => {
    const { prisma, audit } = createMock({
      id: 'u-1',
      phone: null,
      role: 'DRIVER',
      status: 'PENDING_APPROVAL',
      driverProfile: null,
    });
    const service = new AdminDriverReviewService(prisma as never, audit as never);

    await expect(service.reject(admin, 'u-1', 'no')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('returns 409 when approving a driver that is not pending', async () => {
    const { prisma, audit } = createMock({
      id: 'u-1',
      phone: '+84900000002',
      role: 'DRIVER',
      status: 'ACTIVE',
      driverProfile: {
        userId: 'u-1',
        vehicleType: 'VAN',
        licensePlate: 'X',
        licenseNumber: 'Y',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        rejectionReason: null,
      },
    });
    const service = new AdminDriverReviewService(prisma as never, audit as never);

    await expect(service.approve(admin, 'u-1')).rejects.toMatchObject({
      code: 'DRIVER_APPLICATION_NOT_PENDING',
    });
  });

  it('returns 404 when the user is not a driver with a profile', async () => {
    const { prisma, audit } = createMock({
      id: 'u-1',
      phone: '+84900000002',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      driverProfile: null,
    });
    const service = new AdminDriverReviewService(prisma as never, audit as never);

    await expect(service.approve(admin, 'u-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
