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
    // 500000 * 0.8 (online 80%) - 100000 (pending) - 50000 (approved) = 250000
    expect(summary.availableBalanceVnd).toBe(250000);
  });

  it('correctly calculates 20% platform fee for CASH orders and adds completed deposits', async () => {
    const { prisma, repo, driverId } = await setup();
    // 1. Order cash 200,000đ: driver collected cash, owes 20% fee = -40,000đ
    const cashOrder = await prisma.order.create({
      data: { customerId: 'c1', driverId, status: 'DELIVERED', priceVnd: 200000 },
    });
    await prisma.paymentIntent.create({
      data: {
        orderId: cashOrder.id,
        amountVnd: 200000,
        status: 'PAID_MANUAL',
        confirmationNote: 'Tài xế đã thu tiền mặt 200.000 ₫ từ khách',
      },
    });

    // 2. Deposit 100,000đ completed: +100,000đ
    await prisma.driverDeposit.create({
      data: {
        driverId,
        amountVnd: 100000,
        status: 'COMPLETED',
        payosOrderCode: BigInt(123456789),
      },
    });

    const summary = await repo.getWalletSummary(driverId);
    // 100000 (deposit) - 40000 (cash commission 20%) = 60000
    expect(summary.availableBalanceVnd).toBe(60000);
    expect(summary.lifetimeDeliveredVnd).toBe(200000);
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

  it('includes platform fee deduction item in transaction history for delivered CASH orders', async () => {
    const { prisma, repo, driverId } = await setup();
    const order = await prisma.order.create({
      data: {
        customerId: 'c-cash',
        driverId,
        status: 'DELIVERED',
        priceVnd: 500000,
      },
    });
    await prisma.paymentIntent.create({
      data: {
        orderId: order.id,
        amountVnd: 500000,
        status: 'PAID_MANUAL',
        confirmationNote: 'Tài xế đã thu tiền mặt 500.000 ₫ từ khách',
      },
    });

    const res = await repo.findDriverWithdrawalHistory(driverId, 1, 20);

    expect(res.total).toBe(1);
    expect(res.items[0]).toMatchObject({
      id: `fee-${order.id}`,
      type: 'PLATFORM_FEE',
      status: 'APPROVED',
      amountVnd: 100000, // 20% of 500,000
    });
    expect(res.items[0].title).toContain('Phí hoa hồng đơn');
    expect(res.items[0].title).toContain('(thu tiền mặt)');
  });

  it('includes the linked bank account from DriverProfile in the wallet summary', async () => {
    const { prisma, repo, driverId } = await setup();
    await prisma.order.create({ data: { customerId: 'c1', driverId, status: 'DELIVERED', priceVnd: 100000 } });
    await prisma.driverProfile.create({
      data: { userId: driverId, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' },
    });
    // Mock driverProfile.create drops bank fields — set them via update.
    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: {
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
      },
    });

    const summary = await repo.getWalletSummary(driverId);

    expect(summary.bankName).toBe('MB Bank');
    expect(summary.bankAccountNumber).toBe('0987654321');
    expect(summary.bankAccountName).toBe('NGUYEN VAN A');
  });

  it('returns null bank fields when no bank account is linked', async () => {
    const { repo, driverId } = await setup();

    const summary = await repo.getWalletSummary(driverId);

    expect(summary.bankName).toBeNull();
    expect(summary.bankAccountNumber).toBeNull();
    expect(summary.bankAccountName).toBeNull();
  });

  it('updates the linked bank account on DriverProfile', async () => {
    const { prisma, repo, driverId } = await setup();
    await prisma.driverProfile.create({
      data: { userId: driverId, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' },
    });

    const updated = await repo.updateBankAccount(driverId, {
      bankName: 'Vietcombank',
      bankAccountNumber: '1012345678',
      bankAccountName: 'NGUYEN VAN A',
    });

    expect(updated.bankName).toBe('Vietcombank');
    expect(updated.bankAccountNumber).toBe('1012345678');
    expect(updated.bankAccountName).toBe('NGUYEN VAN A');
  });

  it('throws 404 RESOURCE_NOT_FOUND when the driver has no profile', async () => {
    const { repo, driverId } = await setup();

    await expect(
      repo.updateBankAccount(driverId, {
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
      }),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND', status: 404 });
  });
});
