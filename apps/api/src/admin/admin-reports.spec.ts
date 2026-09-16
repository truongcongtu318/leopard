import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import { AdminController } from './admin.controller.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';

async function setup() {
  const prisma = new InMemoryPrismaService();
  const auditRepo = new AuditRepository();
  const auditService = new AuditService(auditRepo);
  const queryService = new AdminQueryService(prisma as never);
  const commandService = new AdminCommandService(prisma as never, auditService);
  const controller = new AdminController(
    queryService,
    commandService,
    null as never,
    null as never,
    null as never,
  );

  const adminUser = await prisma.user.create({
    data: {
      phone: '+84909999999',
      name: 'Admin Quản Trị',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const adminActor: AuthenticatedActor = {
    userId: adminUser.id,
    phone: adminUser.phone ?? '',
    role: 'ADMIN',
  };

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

  const driver1 = await prisma.user.create({
    data: {
      phone: '+84907777777',
      name: 'Lê Tài Xế',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });

  const order1 = await prisma.order.create({
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      customerId: customer1.id,
      driverId: driver1.id,
      status: 'DELIVERED',
      priceVnd: 150000,
      incidentReason: 'DAMAGED_CARGO',
      incidentNote: 'Thùng hàng bị móp khi giao',
      incidentReportedAt: new Date('2026-09-01T10:15:00Z'),
    },
  });

  const order2 = await prisma.order.create({
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      customerId: customer2.id,
      driverId: null,
      status: 'CANCELLED',
      priceVnd: 50000,
    },
  });

  const order3 = await prisma.order.create({
    data: {
      id: '33333333-3333-4333-8333-333333333333',
      customerId: customer1.id,
      driverId: driver1.id,
      status: 'IN_TRANSIT',
      priceVnd: 85000,
    },
  });

  const ticket1 = await prisma.supportTicket.create({
    data: {
      id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      orderId: order1.id,
      customerId: customer1.id,
      category: 'DAMAGED_CARGO',
      description: 'Hàng bị vỡ góc thùng carton khi tài xế giao tới',
      hasPhoto: true,
      status: 'OPEN',
      createdAt: new Date('2026-09-01T10:00:00Z'),
    },
  });

  const ticket2 = await prisma.supportTicket.create({
    data: {
      id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      orderId: order2.id,
      customerId: customer2.id,
      category: 'DRIVER_DELAY',
      description: 'Tài xế đến trễ hơn 45 phút không liên lạc được',
      hasPhoto: false,
      status: 'IN_PROGRESS',
      createdAt: new Date('2026-09-02T10:00:00Z'),
    },
  });

  const ticket3 = await prisma.supportTicket.create({
    data: {
      id: 'cccccccc-3333-4333-8333-cccccccccccc',
      orderId: null,
      customerId: customer1.id,
      category: 'GENERAL_INQUIRY',
      description: 'Hỏi về chính sách khuyến mãi thành viên mới',
      hasPhoto: false,
      status: 'RESOLVED',
      createdAt: new Date('2026-09-03T10:00:00Z'),
    },
  });

  const ticket4 = await prisma.supportTicket.create({
    data: {
      id: 'dddddddd-4444-4444-8444-dddddddddddd',
      orderId: order3.id,
      customerId: customer1.id,
      category: 'LOST_CARGO',
      description: 'Mất một kiện hàng phụ kiện',
      hasPhoto: true,
      status: 'CLOSED',
      createdAt: new Date('2026-09-04T10:00:00Z'),
    },
  });

  return {
    prisma,
    auditService,
    queryService,
    commandService,
    controller,
    adminUser,
    adminActor,
    customer1,
    customer2,
    driver1,
    order1,
    order2,
    order3,
    ticket1,
    ticket2,
    ticket3,
    ticket4,
  };
}

describe('AdminReports', () => {
  describe('AdminQueryService.getReports', () => {
    it('returns paginated reports with mapped properties and relations', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({ page: 1, pageSize: 10 });

      expect(result.total).toBe(4);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(4);

      // Verify ticket with order & driver
      const report1 = result.items.find((r) => r.id === 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
      expect(report1).toBeDefined();
      expect(report1?.ticketNumber).toBe('TK-AAAAAA');
      expect(report1?.orderId).toBe('11111111-1111-4111-8111-111111111111');
      expect(report1?.orderCode).toBe('LP-1111');
      expect(report1?.customerName).toBe('Nguyễn Văn Khách');
      expect(report1?.customerPhone).toBe('+84901234567');
      expect(report1?.driverName).toBe('Lê Tài Xế');
      expect(report1?.category).toBe('DAMAGED_CARGO');
      expect(report1?.hasPhoto).toBe(true);
      expect(report1?.status).toBe('OPEN');
      expect(report1?.severity).toBe('CRITICAL');

      // Verify ticket without order
      const report3 = result.items.find((r) => r.id === 'cccccccc-3333-4333-8333-cccccccccccc');
      expect(report3).toBeDefined();
      expect(report3?.ticketNumber).toBe('TK-CCCCCC');
      expect(report3?.orderId).toBeNull();
      expect(report3?.orderCode).toBeNull();
      expect(report3?.driverId).toBeNull();
      expect(report3?.driverName).toBeNull();
      expect(report3?.severity).toBe('LOW');
    });

    it('filters reports by status', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({ status: 'OPEN' });

      expect(result.total).toBe(1);
      expect(result.items[0].status).toBe('OPEN');
      expect(result.items[0].id).toBe('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
    });

    it('filters reports by category', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({ category: 'DRIVER_DELAY' });

      expect(result.total).toBe(1);
      expect(result.items[0].category).toBe('DRIVER_DELAY');
      expect(result.items[0].severity).toBe('MEDIUM');
    });

    it('filters reports by orderId', async () => {
      const { queryService, order1 } = await setup();
      const result = await queryService.getReports({ orderId: order1.id });

      expect(result.total).toBe(1);
      expect(result.items[0].orderId).toBe(order1.id);
    });

    it('filters reports by date range (from / to)', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({
        from: '2026-09-02T00:00:00Z',
        to: '2026-09-03T23:59:59Z',
      });

      expect(result.total).toBe(2);
      const ids = result.items.map((r) => r.id);
      expect(ids).toContain('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb');
      expect(ids).toContain('cccccccc-3333-4333-8333-cccccccccccc');
    });

    it('searches reports by description', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({ q: 'thùng carton' });

      expect(result.total).toBe(1);
      expect(result.items[0].description).toContain('thùng carton');
    });

    it('searches reports by customer name', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({ q: 'Doanh Nghiệp' });

      expect(result.total).toBe(1);
      expect(result.items[0].customerName).toBe('Trần Thị Doanh Nghiệp');
    });

    it('searches reports by customer phone', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({ q: '+84908888888' });

      expect(result.total).toBe(1);
      expect(result.items[0].customerPhone).toBe('+84908888888');
    });

    it('searches reports by order code', async () => {
      const { queryService } = await setup();
      const result = await queryService.getReports({ q: 'LP-1111' });

      expect(result.total).toBe(1);
      expect(result.items[0].orderCode).toBe('LP-1111');
    });

    it('paginates reports accurately', async () => {
      const { queryService } = await setup();
      const page1 = await queryService.getReports({ page: 1, pageSize: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(4);
      expect(page1.totalPages).toBe(2);

      const page2 = await queryService.getReports({ page: 2, pageSize: 2 });
      expect(page2.items).toHaveLength(2);
      expect(page2.page).toBe(2);

      // Verify no overlap
      const ids1 = page1.items.map((r) => r.id);
      const ids2 = page2.items.map((r) => r.id);
      expect(ids1.some((id) => ids2.includes(id))).toBe(false);
    });
  });

  describe('AdminQueryService.getReportDetail', () => {
    it('returns full report detail workspace with order, customer, and driver info', async () => {
      const { queryService, ticket1, order1 } = await setup();
      const detail = await queryService.getReportDetail(ticket1.id);

      expect(detail).toBeDefined();
      expect(detail.ticket.id).toBe(ticket1.id);
      expect(detail.ticket.ticketNumber).toBe('TK-AAAAAA');
      expect(detail.order).toBeDefined();
      expect(detail.order?.id).toBe(order1.id);
      expect(detail.order?.incidentReason).toBe('DAMAGED_CARGO');
      expect(detail.order?.incidentNote).toBe('Thùng hàng bị móp khi giao');
      expect(detail.customer.name).toBe('Nguyễn Văn Khách');
      expect(detail.driver?.name).toBe('Lê Tài Xế');
    });

    it('returns detail for ticket without order correctly', async () => {
      const { queryService, ticket3 } = await setup();
      const detail = await queryService.getReportDetail(ticket3.id);

      expect(detail).toBeDefined();
      expect(detail.ticket.id).toBe(ticket3.id);
      expect(detail.order).toBeNull();
      expect(detail.driver).toBeNull();
      expect(detail.customer.name).toBe('Nguyễn Văn Khách');
    });

    it('throws DomainError 404 if ticket does not exist', async () => {
      const { queryService } = await setup();
      await expect(queryService.getReportDetail('non-existent-id')).rejects.toThrow(DomainError);
    });
  });

  describe('AdminCommandService.resolveReport', () => {
    it('resolves a report to RESOLVED and records audit log', async () => {
      const { commandService, prisma, adminActor, ticket1 } = await setup();
      const result = await commandService.resolveReport(adminActor, ticket1.id, {
        resolution: 'RESOLVED',
        note: 'Đã hoàn tiền 100% cho khách hàng qua ví',
        clientRequestId: 'req-resolve-001',
      });

      expect(result.status).toBe('RESOLVED');

      // Verify DB update
      const updated = await prisma.supportTicket.findUnique({ where: { id: ticket1.id } });
      expect(updated?.status).toBe('RESOLVED');

      // Verify AuditLog
      const auditLog = await prisma.auditLog.findFirst({
        where: { idempotencyRequestId: 'req-resolve-001' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('REPORT_RESOLVED');
      expect(auditLog?.resourceType).toBe('SupportTicket');
      expect(auditLog?.resourceId).toBe(ticket1.id);
      expect(auditLog?.actorId).toBe(adminActor.userId);
      expect((auditLog?.metadata as any)?.toStatus).toBe('RESOLVED');
      expect((auditLog?.metadata as any)?.note).toBe('Đã hoàn tiền 100% cho khách hàng qua ví');
    });

    it('resolves a report to CLOSED', async () => {
      const { commandService, prisma, adminActor, ticket2 } = await setup();
      const result = await commandService.resolveReport(adminActor, ticket2.id, {
        resolution: 'CLOSED',
        note: 'Đóng khiếu nại sau khi làm việc với tài xế và khách hàng',
      });

      expect(result.status).toBe('CLOSED');
      const updated = await prisma.supportTicket.findUnique({ where: { id: ticket2.id } });
      expect(updated?.status).toBe('CLOSED');
    });

    it('enforces idempotency with clientRequestId', async () => {
      const { commandService, prisma, adminActor, ticket1 } = await setup();
      const first = await commandService.resolveReport(adminActor, ticket1.id, {
        resolution: 'RESOLVED',
        note: 'Giải quyết lần 1',
        clientRequestId: 'idempotent-req-123',
      });

      const second = await commandService.resolveReport(adminActor, ticket1.id, {
        resolution: 'CLOSED',
        note: 'Cố ý gửi lại lần 2',
        clientRequestId: 'idempotent-req-123',
      });

      expect(second.status).toBe('RESOLVED');
      expect(prisma.auditLogs.size).toBe(1);
    });

    it('throws DomainError 404 when resolving non-existent ticket', async () => {
      const { commandService, adminActor } = await setup();
      await expect(
        commandService.resolveReport(adminActor, 'unknown-id', {
          resolution: 'RESOLVED',
          note: 'Ghi chú hợp lệ trên 5 ký tự',
        }),
      ).rejects.toThrow(DomainError);
    });

    it('throws DomainError 422 for invalid resolution status', async () => {
      const { commandService, adminActor, ticket1 } = await setup();
      await expect(
        commandService.resolveReport(adminActor, ticket1.id, {
          resolution: 'OPEN' as any,
          note: 'Ghi chú hợp lệ trên 5 ký tự',
        }),
      ).rejects.toThrow(DomainError);
    });

    it('throws DomainError 422 when note is too short', async () => {
      const { commandService, adminActor, ticket1 } = await setup();
      await expect(
        commandService.resolveReport(adminActor, ticket1.id, {
          resolution: 'RESOLVED',
          note: 'Ngắn',
        }),
      ).rejects.toThrow(DomainError);
    });
  });

  describe('AdminController endpoints', () => {
    it('GET /admin/reports returns paginated list', async () => {
      const { controller } = await setup();
      const res = await controller.getReports({ page: 1, pageSize: 5 });

      expect(res.total).toBe(4);
      expect(res.items).toHaveLength(4);
    });

    it('GET /admin/reports/:id returns report detail', async () => {
      const { controller, ticket1 } = await setup();
      const res = await controller.getReportDetail(ticket1.id);

      expect(res.ticket.id).toBe(ticket1.id);
      expect(res.order).toBeDefined();
    });

    it('POST /admin/reports/:id/resolve processes resolution command', async () => {
      const { controller, adminActor, ticket1 } = await setup();
      const res = await controller.resolveReport(adminActor, ticket1.id, {
        resolution: 'RESOLVED',
        note: 'Xử lý qua controller endpoint thành công',
      });

      expect(res.status).toBe('RESOLVED');
    });
  });
});
