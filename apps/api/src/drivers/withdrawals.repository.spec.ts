// apps/api/src/drivers/withdrawals.repository.spec.ts
import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { WithdrawalsRepository } from './withdrawals.repository.js';

describe('WithdrawalsRepository', () => {
  async function setup() {
    const prisma = new InMemoryPrismaService();
    const repo = new WithdrawalsRepository(prisma as never);
    const driver = await prisma.user.create({ data: { phone: '+84900000001', role: 'DRIVER', status: 'ACTIVE' } });
    return { prisma, repo, driverId: driver.id };
  }

  it('sums only DELIVERED orders for the given driver into lifetimeDeliveredVnd', async () => {
    const { prisma, repo, driverId } = await setup();
    await prisma.order.create({ data: { customerId: 'c1', driverId, status: 'DELIVERED', priceVnd: 100000 } });
    await prisma.order.create({ data: { customerId: 'c2', driverId, status: 'DELIVERED', priceVnd: 50000 } });
    await prisma.order.create({ data: { customerId: 'c3', driverId, status: 'IN_TRANSIT', priceVnd: 999999 } });
    await prisma.order.create({ data: { customerId: 'c4', driverId: 'other-driver', status: 'DELIVERED', priceVnd: 777777 } });

    const summary = await repo.getWalletSummary(driverId);

    expect(summary.lifetimeDeliveredVnd).toBe(150000);
    expect(summary.deliveredOrderCount).toBe(2);
  });

  it('subtracts PENDING and APPROVED withdrawals (not REJECTED) from availableBalanceVnd', async () => {
    const { prisma, repo, driverId } = await setup();
    await prisma.order.create({ data: { customerId: 'c1', driverId, status: 'DELIVERED', priceVnd: 500000 } });
    await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });
    const approved = await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 50000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });
    await prisma.withdrawalRequest.update({ where: { id: approved.id }, data: { status: 'APPROVED' } });
    const rejected = await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 200000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });
    await prisma.withdrawalRequest.update({ where: { id: rejected.id }, data: { status: 'REJECTED' } });

    const summary = await repo.getWalletSummary(driverId);

    expect(summary.lifetimeDeliveredVnd).toBe(500000);
    expect(summary.pendingWithdrawalVnd).toBe(100000);
    expect(summary.availableBalanceVnd).toBe(350000); // 500000 - 100000 (pending) - 50000 (approved)
  });

  it('finds an existing request by clientRequestId for idempotent replay', async () => {
    const { repo, driverId } = await setup();
    const created = await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 10000,
      bankName: 'MB Bank',
      bankAccountNumber: '111',
      bankAccountName: 'A',
      clientRequestId: 'req-1',
    });

    const found = await repo.findWithdrawalRequestByClientRequestId(driverId, 'req-1');

    expect(found?.id).toBe(created.id);
  });

  it('paginates a driver\'s withdrawal history, newest first', async () => {
    const { repo, driverId } = await setup();
    await repo.createWithdrawalRequest({ driverId, amountVnd: 1000, bankName: 'A', bankAccountNumber: '1', bankAccountName: 'A' });
    await repo.createWithdrawalRequest({ driverId, amountVnd: 2000, bankName: 'A', bankAccountNumber: '1', bankAccountName: 'A' });

    const page = await repo.findDriverWithdrawalHistory(driverId, 1, 20);

    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(2);
    expect(page.items[0].amountVnd).toBe(2000); // most recently created first
  });
});
