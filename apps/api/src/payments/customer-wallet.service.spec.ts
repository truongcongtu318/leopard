import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { CustomerWalletService } from './customer-wallet.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

describe('CustomerWalletService', () => {
  const customerId = 'cust-123';
  const customerActor: AuthenticatedActor = {
    userId: customerId,
    role: 'CUSTOMER',
    sessionId: 'sess-cust',
  };

  async function setup() {
    const prisma = new InMemoryPrismaService();
    const auditRepo = new AuditRepository(prisma as never);
    const auditService = new AuditService(auditRepo);
    const service = new CustomerWalletService(prisma as never, auditService);

    await prisma.user.create({
      data: {
        id: customerId,
        phone: '+84988776655',
        role: 'CUSTOMER',
        fullName: 'Nguyễn Văn Khách',
        status: 'ACTIVE',
      },
    });

    return { prisma, service };
  }

  it('calculates refundable balance correctly from cancelled orders with paid payments', async () => {
    const { prisma, service } = await setup();

    // 1. Order 1: Cancelled, paid 300,000 VND
    const o1 = await prisma.order.create({
      data: {
        customerId,
        status: 'CANCELLED',
        priceVnd: 300000,
        vehicleType: 'VAN_500KG',
        originAddress: 'Kho A',
        destinationAddress: 'Kho B',
        originLat: 10.7,
        originLng: 106.6,
        destinationLat: 10.8,
        destinationLng: 106.7,
      },
    });
    await prisma.paymentIntent.create({
      data: {
        orderId: o1.id,
        amountVnd: 300000,
        status: 'PAID_MANUAL',
      },
    });

    // 2. Order 2: Active (IN_TRANSIT), paid 200,000 VND
    const o2 = await prisma.order.create({
      data: {
        customerId,
        status: 'IN_TRANSIT',
        priceVnd: 200000,
        vehicleType: 'VAN_500KG',
        originAddress: 'Kho C',
        destinationAddress: 'Kho D',
        originLat: 10.7,
        originLng: 106.6,
        destinationLat: 10.8,
        destinationLng: 106.7,
      },
    });
    await prisma.paymentIntent.create({
      data: {
        orderId: o2.id,
        amountVnd: 200000,
        status: 'PAID_MANUAL',
      },
    });

    // 3. Existing pending withdrawal: 100,000 VND
    await prisma.withdrawalRequest.create({
      data: {
        driverId: customerId,
        amountVnd: 100000,
        status: 'PENDING',
        bankName: 'Vietcombank',
        bankAccountNumber: '0071000123456',
        bankAccountName: 'NGUYEN VAN KHACH',
      },
    });

    const summary = await service.getWalletSummary(customerId);

    // Cancelled paid: 300k, Pending withdrawal: 100k -> Refundable: 200k
    expect(summary.cancelledPaidAmount).toBe(300000);
    expect(summary.totalHeldEscrowVnd).toBe(200000);
    expect(summary.pendingWithdrawalsVnd).toBe(100000);
    expect(summary.refundableBalanceVnd).toBe(200000);
    expect(summary.withdrawalRequests).toHaveLength(1);
    expect(summary.withdrawalRequests[0].amountVnd).toBe(100000);
  });

  it('rejects withdrawal request when amount exceeds refundable balance', async () => {
    const { service } = await setup();

    // Refundable balance is 0
    await expect(
      service.requestWithdrawal(customerActor, {
        amountVnd: 50000,
        bankName: 'MB Bank',
        bankAccountNumber: '123456',
        bankAccountName: 'NGUYEN VAN KHACH',
      }),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      status: 409,
    });
  });

  it('creates withdrawal request successfully and logs audit', async () => {
    const { prisma, service } = await setup();

    // Add cancelled paid order for 500,000 VND
    const o = await prisma.order.create({
      data: {
        customerId,
        status: 'CANCELLED',
        priceVnd: 500000,
        vehicleType: 'VAN_500KG',
        originAddress: 'Kho A',
        destinationAddress: 'Kho B',
        originLat: 10.7,
        originLng: 106.6,
        destinationLat: 10.8,
        destinationLng: 106.7,
      },
    });
    await prisma.paymentIntent.create({
      data: {
        orderId: o.id,
        amountVnd: 500000,
        status: 'PAID_MANUAL',
      },
    });

    const req = await service.requestWithdrawal(customerActor, {
      amountVnd: 200000,
      bankName: 'Vietcombank',
      bankAccountNumber: '0071000123456',
      bankAccountName: 'nguyen van khach',
      clientRequestId: 'req-cust-001',
    });

    expect(req.id).toBeDefined();
    expect(req.amountVnd).toBe(200000);
    expect(req.status).toBe('PENDING');
    expect(req.bankAccountName).toBe('NGUYEN VAN KHACH');

    // Audit logged
    const audits = Array.from(prisma.auditLogs.values()).filter(
      (a) => a.action === 'CUSTOMER_WITHDRAWAL_REQUESTED',
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(customerId);

    // After withdrawal request, available refundable balance decreases
    const updatedSummary = await service.getWalletSummary(customerId);
    expect(updatedSummary.refundableBalanceVnd).toBe(300000);
  });
});
