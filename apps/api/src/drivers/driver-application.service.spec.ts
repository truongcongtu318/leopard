import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Role, UserStatus } from '@prisma/client';

import { DriverApplicationService } from './driver-application.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

interface FakeUser {
  id: string;
  role: Role;
  status: UserStatus;
  driverProfile?: FakeProfile | null;
}

interface FakeProfile {
  userId: string;
  vehicleType: string;
  licensePlate: string | null;
  licenseNumber: string | null;
  availability: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  rejectionReason: string | null;
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
};

function createPrismaMock(user: FakeUser | null) {
  const profiles = new Map<string, FakeProfile>();

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
          create: Partial<FakeProfile>;
          update: Partial<FakeProfile>;
        }) => {
          const existing = profiles.get(where.userId);
          const next: FakeProfile = existing
            ? { ...existing, ...update }
            : {
                userId: where.userId,
                vehicleType: 'MOTORBIKE',
                licensePlate: null,
                licenseNumber: null,
                availability: 'OFFLINE',
                submittedAt: null,
                reviewedAt: null,
                reviewedById: null,
                rejectionReason: null,
                ...create,
              };
          profiles.set(where.userId, next);
          return next;
        },
      ),
    },
  };

  return {
    profiles,
    prisma: {
      user: {
        findUnique: jest.fn(async () => user),
      },
      $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      _tx: tx,
    },
  };
}

describe('DriverApplicationService', () => {
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moves a customer to DRIVER / PENDING_APPROVAL and stores the vehicle details', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'CUSTOMER', status: 'ACTIVE' });
    const service = new DriverApplicationService(mock.prisma as never);

    const view = await service.apply(actor, validDto);

    expect(view).toMatchObject({
      status: 'PENDING_APPROVAL',
      vehicleType: 'VAN',
      licensePlate: '59D-123.45',
      licenseNumber: 'GPLX-0001',
      rejectionReason: null,
    });
    expect(view.submittedAt).not.toBeNull();
    expect(mock.prisma._tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'DRIVER', status: 'PENDING_APPROVAL', name: 'Nguyễn Văn A' },
    });
  });

  it('rejects an application when the account is already an active driver', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'DRIVER', status: 'ACTIVE' });
    const service = new DriverApplicationService(mock.prisma as never);

    await expect(service.apply(actor, validDto)).rejects.toMatchObject({
      code: 'DRIVER_ALREADY_ACTIVE',
    });
    expect(mock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an application that is still pending review', async () => {
    mock = createPrismaMock({
      id: 'user-1',
      role: 'DRIVER',
      status: 'PENDING_APPROVAL',
    });
    const service = new DriverApplicationService(mock.prisma as never);

    await expect(service.apply(actor, validDto)).rejects.toMatchObject({
      code: 'DRIVER_APPLICATION_PENDING',
    });
  });

  it('lets a rejected driver re-apply and clears the previous rejection reason', async () => {
    mock = createPrismaMock({ id: 'user-1', role: 'DRIVER', status: 'REJECTED' });
    mock.profiles.set('user-1', {
      userId: 'user-1',
      vehicleType: 'MOTORBIKE',
      licensePlate: 'OLD',
      licenseNumber: 'OLD',
      availability: 'OFFLINE',
      submittedAt: new Date('2026-08-01T00:00:00.000Z'),
      reviewedAt: new Date('2026-08-02T00:00:00.000Z'),
      reviewedById: 'admin-1',
      rejectionReason: 'Ảnh giấy tờ mờ',
    });
    const service = new DriverApplicationService(mock.prisma as never);

    const view = await service.apply(actor, validDto);

    expect(view.rejectionReason).toBeNull();
    expect(view.reviewedAt).toBeNull();
    expect(view.vehicleType).toBe('VAN');
  });

  it('returns 404 when reading an application that does not exist', async () => {
    mock = createPrismaMock({
      id: 'user-1',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      driverProfile: null,
    });
    const service = new DriverApplicationService(mock.prisma as never);

    await expect(service.getMyApplication(actor)).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
