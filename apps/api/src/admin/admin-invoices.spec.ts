import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AdminQueryService } from './admin-query.service.js';
import { AdminController } from './admin.controller.js';
import type { InvoiceStatus } from '@prisma/client';

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

  const customer1 = await prisma.user.create({
    data: {
      phone: '+84901234567',
      name: 'Nguyễn Văn Khách',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      phone: '+84908888888',
      name: 'Trần Thị Doanh Nghiệp',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const order1 = await prisma.order.create({
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      customerId: customer1.id,
      status: 'DELIVERED',
      priceVnd: 220000,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      customerId: customer2.id,
      status: 'DELIVERED',
      priceVnd: 550000,
    },
  });

  const order3 = await prisma.order.create({
    data: {
      id: '33333333-3333-4333-8333-333333333333',
      customerId: customer1.id,
      status: 'DELIVERED',
      priceVnd: 110000,
    },
  });

  const payment1 = await prisma.paymentIntent.create({
    data: {
      orderId: order1.id,
      amountVnd: 220000,
      status: 'PAID_MANUAL',
    },
  });

  const payment2 = await prisma.paymentIntent.create({
    data: {
      orderId: order2.id,
      amountVnd: 550000,
      status: 'PAID_MANUAL',
    },
  });

  const payment3 = await prisma.paymentIntent.create({
    data: {
      orderId: order3.id,
      amountVnd: 110000,
      status: 'PAID_MANUAL',
    },
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      orderId: order1.id,
      paymentIntentId: payment1.id,
      invoiceNumber: 'INV-2026-0001',
      customerName: 'Nguyễn Văn Khách',
      customerEmail: 'khach@example.com',
      customerTaxCode: '0101234567',
      customerAddress: '123 Phố Huế, Hà Nội',
      amountVnd: 200000,
      vatRateVnd: 20000,
      totalVnd: 220000,
      pdfStorageKey: 'invoices/2026/INV-2026-0001.pdf',
      status: 'ISSUED' as InvoiceStatus,
      emailSentAt: new Date('2026-09-01T10:00:00Z'),
      issuedAt: new Date('2026-09-01T09:00:00Z'),
      createdAt: new Date('2026-09-01T09:00:00Z'),
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      orderId: order2.id,
      paymentIntentId: payment2.id,
      invoiceNumber: 'INV-2026-0002',
      customerName: 'Công ty Cổ phần ABC',
      customerEmail: null,
      customerTaxCode: '0309999999',
      customerAddress: '456 Lê Duẩn, Đà Nẵng',
      amountVnd: 500000,
      vatRateVnd: 50000,
      totalVnd: 550000,
      pdfStorageKey: 'invoices/2026/INV-2026-0002.pdf',
      status: 'ISSUED' as InvoiceStatus,
      emailSentAt: null,
      issuedAt: new Date('2026-09-10T14:00:00Z'),
      createdAt: new Date('2026-09-10T14:00:00Z'),
    },
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      orderId: order3.id,
      paymentIntentId: payment3.id,
      invoiceNumber: 'INV-2026-0003',
      customerName: 'Nguyễn Văn Khách',
      customerEmail: '',
      customerTaxCode: null,
      customerAddress: null,
      amountVnd: 100000,
      vatRateVnd: 10000,
      totalVnd: 110000,
      pdfStorageKey: 'invoices/2026/INV-2026-0003.pdf',
      status: 'VOIDED' as InvoiceStatus,
      emailSentAt: null,
      issuedAt: new Date('2026-09-12T16:00:00Z'),
      createdAt: new Date('2026-09-12T16:00:00Z'),
    },
  });

  return {
    prisma,
    queryService,
    controller,
    customer1,
    customer2,
    order1,
    order2,
    order3,
    invoice1,
    invoice2,
    invoice3,
  };
}

describe('AdminInvoices', () => {
  describe('AdminQueryService.getInvoices', () => {
    it('returns paginated invoices list with correctly mapped properties', async () => {
      const { queryService } = await setup();
      const result = await queryService.getInvoices({ page: 1, pageSize: 10 });

      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(3);

      const inv1 = result.items.find((i) => i.invoiceNumber === 'INV-2026-0001');
      expect(inv1).toBeDefined();
      expect(inv1?.customerName).toBe('Nguyễn Văn Khách');
      expect(inv1?.customerEmail).toBe('khach@example.com');
      expect(inv1?.customerTaxCode).toBe('0101234567');
      expect(inv1?.customerAddress).toBe('123 Phố Huế, Hà Nội');
      expect(inv1?.amountVnd).toBe(200000);
      expect(inv1?.vatRateVnd).toBe(20000);
      expect(inv1?.totalVnd).toBe(220000);
      expect(inv1?.status).toBe('ISSUED');
      expect(inv1?.emailSentAt).toBe(new Date('2026-09-01T10:00:00Z').toISOString());
      expect(inv1?.isMissingEmail).toBe(false);
      expect(inv1?.orderCode).toBe('LP-1111');
      expect(inv1?.issuedAt).toBe(new Date('2026-09-01T09:00:00Z').toISOString());
    });

    it('filters invoices by status', async () => {
      const { queryService } = await setup();
      const result = await queryService.getInvoices({
        status: 'VOIDED',
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].invoiceNumber).toBe('INV-2026-0003');
      expect(result.items[0].status).toBe('VOIDED');
    });

    it('filters invoices with missing email (isMissingEmail)', async () => {
      const { queryService } = await setup();
      const result = await queryService.getInvoices({
        missingEmail: true,
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items.every((i) => i.isMissingEmail)).toBe(true);

      const numbers = result.items.map((i) => i.invoiceNumber);
      expect(numbers).toContain('INV-2026-0002');
      expect(numbers).toContain('INV-2026-0003');
      expect(numbers).not.toContain('INV-2026-0001');
    });

    it('searches invoices by query string (invoiceNumber, customerName, customerEmail)', async () => {
      const { queryService } = await setup();

      const searchByNumber = await queryService.getInvoices({ q: 'INV-2026-0002', page: 1, pageSize: 10 });
      expect(searchByNumber.total).toBe(1);
      expect(searchByNumber.items[0].invoiceNumber).toBe('INV-2026-0002');

      const searchByName = await queryService.getInvoices({ q: 'Công ty Cổ phần', page: 1, pageSize: 10 });
      expect(searchByName.total).toBe(1);
      expect(searchByName.items[0].customerName).toBe('Công ty Cổ phần ABC');

      const searchByEmail = await queryService.getInvoices({ q: 'khach@example.com', page: 1, pageSize: 10 });
      expect(searchByEmail.total).toBe(1);
      expect(searchByEmail.items[0].customerEmail).toBe('khach@example.com');
    });

    it('filters invoices by date range (from, to)', async () => {
      const { queryService } = await setup();
      const result = await queryService.getInvoices({
        from: '2026-09-05T00:00:00Z',
        to: '2026-09-11T23:59:59Z',
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].invoiceNumber).toBe('INV-2026-0002');
    });

    it('handles pagination correctly', async () => {
      const { queryService } = await setup();
      const page1 = await queryService.getInvoices({ page: 1, pageSize: 2 });
      expect(page1.total).toBe(3);
      expect(page1.items).toHaveLength(2);
      expect(page1.totalPages).toBe(2);

      const page2 = await queryService.getInvoices({ page: 2, pageSize: 2 });
      expect(page2.total).toBe(3);
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });
  });

  describe('AdminController.getInvoices', () => {
    it('delegates to queryService with parsed page query and boolean coercion', async () => {
      const { controller } = await setup();
      const result = await controller.getInvoices({
        page: '1',
        pageSize: '10',
        missingEmail: 'true',
      });

      expect(result.total).toBe(2);
      expect(result.items.every((i) => i.isMissingEmail)).toBe(true);
    });
  });
});
