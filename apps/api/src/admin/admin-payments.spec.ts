import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AdminQueryService } from './admin-query.service.js';
import { AdminController } from './admin.controller.js';
import type { PaymentStatus, ProviderSource } from '@prisma/client';

async function setup() {
  const prisma = new InMemoryPrismaService();
  const queryService = new AdminQueryService(prisma as never);
  const controller = new AdminController(
    queryService,
    null as never,
    null as never,
    null as never,
    null as never,
  );

  const customer = await prisma.user.create({
    data: {
      phone: '+84901234567',
      name: 'Nguyễn Văn Khách',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const admin = await prisma.user.create({
    data: {
      phone: '+84909999999',
      name: 'Admin Quản Trị',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const order1 = await prisma.order.create({
    data: {
      customerId: customer.id,
      status: 'DELIVERED',
      priceVnd: 250000,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      customerId: customer.id,
      status: 'IN_TRANSIT',
      priceVnd: 150000,
    },
  });

  const payment1 = await prisma.paymentIntent.create({
    data: {
      orderId: order1.id,
      amountVnd: 250000,
      status: 'PAID_MANUAL' as PaymentStatus,
      provider: 'VIETQR' as ProviderSource,
      providerReference: 'VQR-123456',
      confirmedById: admin.id,
      confirmedAt: new Date(),
      confirmationNote: 'Xác nhận chuyển khoản Techcombank',
    },
  });

  const payment2 = await prisma.paymentIntent.create({
    data: {
      orderId: order2.id,
      amountVnd: 150000,
      status: 'UNPAID' as PaymentStatus,
      provider: 'PAYOS' as ProviderSource,
    },
  });

  return { prisma, queryService, controller, customer, admin, order1, order2, payment1, payment2 };
}

describe('AdminPayments', () => {
  describe('AdminQueryService.getPayments', () => {
    it('returns paginated payments list with mapped properties', async () => {
      const { queryService } = await setup();
      const result = await queryService.getPayments({ page: 1, pageSize: 10 });

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(2);

      const paidItem = result.items.find((i) => i.status === 'PAID_MANUAL');
      expect(paidItem).toBeDefined();
      expect(paidItem?.amountVnd).toBe(250000);
      expect(paidItem?.customerName).toBe('Nguyễn Văn Khách');
      expect(paidItem?.customerPhone).toBe('+84901234567');
      expect(paidItem?.confirmedByName).toBe('Admin Quản Trị');
      expect(paidItem?.confirmationNote).toBe('Xác nhận chuyển khoản Techcombank');
      expect(paidItem?.orderCode).toMatch(/^LP-[A-Z0-9]{4}$/);
    });

    it('filters payments by status', async () => {
      const { queryService } = await setup();
      const result = await queryService.getPayments({
        status: 'PAID_MANUAL' as PaymentStatus,
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('PAID_MANUAL');
    });

    it('filters payments by source provider', async () => {
      const { queryService } = await setup();
      const result = await queryService.getPayments({
        source: 'PAYOS' as ProviderSource,
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].provider).toBe('PAYOS');
    });

    it('handles pagination correctly', async () => {
      const { queryService } = await setup();
      const page1 = await queryService.getPayments({ page: 1, pageSize: 1 });
      expect(page1.total).toBe(2);
      expect(page1.items).toHaveLength(1);
      expect(page1.totalPages).toBe(2);

      const page2 = await queryService.getPayments({ page: 2, pageSize: 1 });
      expect(page2.total).toBe(2);
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });
  });

  describe('AdminController.getPayments', () => {
    it('delegates to queryService with parsed page query', async () => {
      const { controller } = await setup();
      const result = await controller.getPayments({
        page: '1',
        pageSize: '10',
        status: 'PAID_MANUAL',
      });

      expect(result.total).toBe(1);
      expect(result.items[0].status).toBe('PAID_MANUAL');
    });
  });
});
