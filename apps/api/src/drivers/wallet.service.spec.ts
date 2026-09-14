import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { WalletService } from './wallet.service.js';

function createMockPrisma() {
  const driverProfile = {
    findUnique: jest.fn<any>(),
    update: jest.fn<any>(),
  };
  const payoutRequest = {
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
  };

  const tx = {
    driverProfile,
    payoutRequest,
  };

  const prisma = {
    driverProfile,
    payoutRequest,
    $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  };

  return { prisma, tx };
}

const driverActor: AuthenticatedActor = {
  userId: 'driver-u-1',
  role: 'DRIVER',
  sessionId: 'sess-1',
};

const adminActor: AuthenticatedActor = {
  userId: 'admin-u-1',
  role: 'ADMIN',
  sessionId: 'sess-2',
};

describe('WalletService', () => {
  let mocks: ReturnType<typeof createMockPrisma>;
  let service: WalletService;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockPrisma();
    service = new WalletService(mocks.prisma as never);
  });

  describe('getWallet', () => {
    it('returns wallet info with recent payouts', async () => {
      mocks.prisma.driverProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: driverActor.userId,
        balanceVnd: 500_000,
        bankName: 'Vietcombank',
        bankAccountNumber: '0123456789',
        bankAccountName: 'NGUYEN VAN A',
        payoutRequests: [{ id: 'payout-1', amountVnd: 100_000, status: 'APPROVED' }],
      });

      const result = await service.getWallet(driverActor);

      expect(result).toEqual({
        balanceVnd: 500_000,
        bankName: 'Vietcombank',
        bankAccountNumber: '0123456789',
        bankAccountName: 'NGUYEN VAN A',
        recentPayouts: [{ id: 'payout-1', amountVnd: 100_000, status: 'APPROVED' }],
      });
      expect(mocks.prisma.driverProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: driverActor.userId },
        include: {
          payoutRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });
    });

    it('throws 404 if driver profile is missing', async () => {
      mocks.prisma.driverProfile.findUnique.mockResolvedValue(null);

      await expect(service.getWallet(driverActor)).rejects.toThrow(DomainError);
      await expect(service.getWallet(driverActor)).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('requestPayout', () => {
    it('creates payout and decrements balance when balance is sufficient', async () => {
      mocks.tx.driverProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: driverActor.userId,
        balanceVnd: 300_000,
        bankName: 'MBBank',
        bankAccountNumber: '9876543210',
        bankAccountName: 'NGUYEN VAN A',
        user: { name: 'NGUYEN VAN A' },
      });
      mocks.tx.payoutRequest.create.mockResolvedValue({
        id: 'payout-100',
        driverProfileId: 'profile-1',
        amountVnd: 200_000,
        status: 'PENDING',
        bankName: 'MBBank',
        bankAccountNumber: '9876543210',
        bankAccountName: 'NGUYEN VAN A',
      });

      const result = await service.requestPayout(driverActor, 200_000, 'req-1');

      expect(mocks.tx.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: { balanceVnd: { decrement: 200_000 } },
      });
      expect(mocks.tx.payoutRequest.create).toHaveBeenCalledWith({
        data: {
          driverProfileId: 'profile-1',
          amountVnd: 200_000,
          status: 'PENDING',
          bankName: 'MBBank',
          bankAccountNumber: '9876543210',
          bankAccountName: 'NGUYEN VAN A',
        },
      });
      expect(result).toMatchObject({ id: 'payout-100', amountVnd: 200_000, status: 'PENDING' });
    });

    it('uses fallback bank info if profile bank details are empty', async () => {
      mocks.tx.driverProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: driverActor.userId,
        balanceVnd: 100_000,
        bankName: null,
        bankAccountNumber: null,
        bankAccountName: null,
        user: { name: 'Tài Xế Mẫu' },
      });
      mocks.tx.payoutRequest.create.mockImplementation(async ({ data }: any) => ({
        id: 'payout-101',
        ...data,
      }));

      await service.requestPayout(driverActor, 50_000, 'req-fallback');

      expect(mocks.tx.payoutRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bankName: 'Vietcombank',
          bankAccountNumber: '1234567890',
          bankAccountName: 'Tài Xế Mẫu',
        }),
      });
    });

    it('rejects with INSUFFICIENT_BALANCE when balance < amount', async () => {
      mocks.tx.driverProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: driverActor.userId,
        balanceVnd: 50_000,
        bankName: 'Vietcombank',
        bankAccountNumber: '1234567890',
        bankAccountName: 'TÀI XẾ',
      });

      await expect(service.requestPayout(driverActor, 100_000, 'req-fail')).rejects.toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
        status: 400,
      });
      expect(mocks.tx.driverProfile.update).not.toHaveBeenCalled();
      expect(mocks.tx.payoutRequest.create).not.toHaveBeenCalled();
    });

    it('rejects when amountVnd <= 0 or not integer', async () => {
      await expect(service.requestPayout(driverActor, 0, 'req-0')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
      await expect(service.requestPayout(driverActor, -10_000, 'req-neg')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });
  });

  describe('approvePayout', () => {
    it('approves a pending payout when called by ADMIN', async () => {
      mocks.prisma.payoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        status: 'PENDING',
        amountVnd: 100_000,
      });
      mocks.prisma.payoutRequest.update.mockResolvedValue({
        id: 'payout-1',
        status: 'APPROVED',
        processedById: adminActor.userId,
      });

      const result = await service.approvePayout(adminActor, 'payout-1');

      expect(mocks.prisma.payoutRequest.update).toHaveBeenCalledWith({
        where: { id: 'payout-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          processedById: adminActor.userId,
        }),
      });
      expect(result).toMatchObject({ status: 'APPROVED' });
    });

    it('forbids non-admin actor', async () => {
      await expect(service.approvePayout(driverActor, 'payout-1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('rejects if payout not found or not in PENDING status', async () => {
      mocks.prisma.payoutRequest.findUnique.mockResolvedValue(null);
      await expect(service.approvePayout(adminActor, 'payout-none')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });

      mocks.prisma.payoutRequest.findUnique.mockResolvedValue({
        id: 'payout-done',
        status: 'APPROVED',
      });
      await expect(service.approvePayout(adminActor, 'payout-done')).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        status: 400,
      });
    });
  });

  describe('rejectPayout', () => {
    it('refunds driver balance and marks status as REJECTED', async () => {
      mocks.tx.payoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        driverProfileId: 'profile-1',
        amountVnd: 150_000,
        status: 'PENDING',
      });
      mocks.tx.payoutRequest.update.mockResolvedValue({
        id: 'payout-1',
        status: 'REJECTED',
        processedById: adminActor.userId,
      });

      const result = await service.rejectPayout(adminActor, 'payout-1', 'Sai số tài khoản');

      expect(mocks.tx.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: { balanceVnd: { increment: 150_000 } },
      });
      expect(mocks.tx.payoutRequest.update).toHaveBeenCalledWith({
        where: { id: 'payout-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          processedById: adminActor.userId,
        }),
      });
      expect(result).toMatchObject({ status: 'REJECTED' });
    });

    it('forbids non-admin actor from rejecting', async () => {
      await expect(service.rejectPayout(driverActor, 'payout-1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });
  });
});
