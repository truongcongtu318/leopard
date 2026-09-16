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
      phone: '+84909888888',
      name: 'Trần Thị Doanh Nghiệp',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const driver1 = await prisma.user.create({
    data: {
      phone: '+84903333333',
      name: 'Lê Tài Xế 1',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });

  const driver2 = await prisma.user.create({
    data: {
      phone: '+84904444444',
      name: 'Phạm Tài Xế 2',
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
      clientRequestId: 'req-order-1',
    },
  });

  const order2 = await prisma.order.create({
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      customerId: customer2.id,
      driverId: driver2.id,
      status: 'DELIVERED',
      clientRequestId: 'req-order-2',
    },
  });

  const order3 = await prisma.order.create({
    data: {
      id: '33333333-3333-4333-8333-333333333333',
      customerId: customer1.id,
      driverId: driver2.id,
      status: 'DELIVERED',
      clientRequestId: 'req-order-3',
    },
  });

  const rev1 = await prisma.orderReview.create({
    data: {
      id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      orderId: order1.id,
      customerId: customer1.id,
      rating: 5,
      comment: 'Dịch vụ tuyệt vời, tài xế giao rất nhanh',
      tipVnd: 20000,
      createdAt: new Date('2026-09-01T10:00:00Z'),
    },
  });

  const rev2 = await prisma.orderReview.create({
    data: {
      id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      orderId: order2.id,
      customerId: customer2.id,
      rating: 2,
      comment: 'Tài xế đi lạc đường, thái độ không tốt',
      tipVnd: 0,
      createdAt: new Date('2026-09-02T10:00:00Z'),
    },
  });

  const rev3 = await prisma.orderReview.create({
    data: {
      id: 'cccccccc-3333-4333-8333-cccccccccccc',
      orderId: order3.id,
      customerId: customer1.id,
      rating: 4,
      comment: 'Giao hàng đúng giờ, đóng gói cẩn thận',
      tipVnd: 10000,
      createdAt: new Date('2026-09-03T10:00:00Z'),
    },
  });

  return {
    prisma,
    auditService,
    queryService,
    commandService,
    controller,
    adminActor,
    customer1,
    customer2,
    driver1,
    driver2,
    order1,
    order2,
    order3,
    rev1,
    rev2,
    rev3,
  };
}

describe('AdminReviews', () => {
  describe('AdminQueryService.getReviews', () => {
    it('returns paginated reviews with mapped properties and phone masking', async () => {
      const { queryService, customer1, driver1 } = await setup();
      const res = await queryService.getReviews({});

      expect(res.total).toBe(3);
      expect(res.items.length).toBe(3);

      const item1 = res.items.find((i) => i.id === 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
      expect(item1).toBeDefined();
      expect(item1?.rating).toBe(5);
      expect(item1?.comment).toBe('Dịch vụ tuyệt vời, tài xế giao rất nhanh');
      expect(item1?.tipVnd).toBe(20000);
      expect(item1?.customerName).toBe(customer1.name);
      expect(item1?.customerPhone).toBe('••• 4567');
      expect(item1?.driverName).toBe(driver1.name);
      expect(item1?.driverPhone).toBe('••• 3333');
      expect(item1?.orderCode).toBe('LP-1111');
    });

    it('filters reviews by minRating and maxRating', async () => {
      const { queryService } = await setup();

      const highRatings = await queryService.getReviews({ minRating: 4 });
      expect(highRatings.total).toBe(2);
      expect(highRatings.items.every((i) => i.rating >= 4)).toBe(true);

      const lowRatings = await queryService.getReviews({ maxRating: 3 });
      expect(lowRatings.total).toBe(1);
      expect(lowRatings.items[0]?.rating).toBe(2);

      const exactRating = await queryService.getReviews({ minRating: 4, maxRating: 4 });
      expect(exactRating.total).toBe(1);
      expect(exactRating.items[0]?.rating).toBe(4);
    });

    it('filters reviews by driverId', async () => {
      const { queryService, driver2 } = await setup();
      const res = await queryService.getReviews({ driverId: driver2.id });

      expect(res.total).toBe(2);
      expect(res.items.every((i) => i.driverId === driver2.id)).toBe(true);
    });

    it('filters reviews by customerId', async () => {
      const { queryService, customer1 } = await setup();
      const res = await queryService.getReviews({ customerId: customer1.id });

      expect(res.total).toBe(2);
      expect(res.items.every((i) => i.customerId === customer1.id)).toBe(true);
    });

    it('filters reviews by date range (from / to)', async () => {
      const { queryService } = await setup();
      const res = await queryService.getReviews({
        from: '2026-09-01T00:00:00Z',
        to: '2026-09-02T12:00:00Z',
      });

      expect(res.total).toBe(2);
    });

    it('searches reviews by comment text', async () => {
      const { queryService } = await setup();
      const res = await queryService.getReviews({ q: 'lạc đường' });

      expect(res.total).toBe(1);
      expect(res.items[0]?.comment).toContain('lạc đường');
    });

    it('searches reviews by customer name', async () => {
      const { queryService } = await setup();
      const res = await queryService.getReviews({ q: 'Doanh Nghiệp' });

      expect(res.total).toBe(1);
      expect(res.items[0]?.customerName).toBe('Trần Thị Doanh Nghiệp');
    });

    it('paginates reviews accurately', async () => {
      const { queryService } = await setup();
      const res = await queryService.getReviews({ page: 1, pageSize: 2 });

      expect(res.items.length).toBe(2);
      expect(res.total).toBe(3);
      expect(res.totalPages).toBe(2);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(2);
    });
  });

  describe('AdminCommandService.hideReview', () => {
    it('successfully hides a review and creates an audit log', async () => {
      const { commandService, prisma, rev1, adminActor } = await setup();

      const updated = await commandService.hideReview(
        rev1.id,
        { reason: 'Ngôn từ phản cảm, vi phạm điều khoản cộng đồng' },
        adminActor.userId,
      );

      expect(updated.comment).toBe('[Đã ẩn bởi Quản trị viên: Ngôn từ phản cảm, vi phạm điều khoản cộng đồng]');

      const storedReview = await prisma.orderReview.findUnique({ where: { id: rev1.id } });
      expect(storedReview?.comment).toBe('[Đã ẩn bởi Quản trị viên: Ngôn từ phản cảm, vi phạm điều khoản cộng đồng]');

      const audit = Array.from(prisma.auditLogs.values()).find(
        (a) => a.action === 'HIDE_REVIEW' && a.resourceId === rev1.id,
      );
      expect(audit).toBeDefined();
      expect(audit?.actorId).toBe(adminActor.userId);
      expect(audit?.resourceType).toBe('ORDER_REVIEW');
      expect((audit?.metadata as any).reason).toBe('Ngôn từ phản cảm, vi phạm điều khoản cộng đồng');
    });

    it('enforces idempotency with clientRequestId', async () => {
      const { commandService, rev2, adminActor } = await setup();
      const clientRequestId = 'idemp-hide-review-123';

      const first = await commandService.hideReview(
        rev2.id,
        { reason: 'Yêu cầu ẩn từ tài xế hợp lệ', clientRequestId },
        adminActor.userId,
      );
      expect(first.comment).toContain('Yêu cầu ẩn từ tài xế hợp lệ');

      const second = await commandService.hideReview(
        rev2.id,
        { reason: 'Yêu cầu khác nhưng cùng requestId', clientRequestId },
        adminActor.userId,
      );
      expect(second.id).toBe(rev2.id);
    });

    it('throws DomainError 404 if review does not exist', async () => {
      const { commandService, adminActor } = await setup();

      await expect(
        commandService.hideReview(
          '99999999-9999-4999-8999-999999999999',
          { reason: 'Lý do hợp lệ trên 5 ký tự' },
          adminActor.userId,
        ),
      ).rejects.toThrow(DomainError);

      try {
        await commandService.hideReview(
          '99999999-9999-4999-8999-999999999999',
          { reason: 'Lý do hợp lệ trên 5 ký tự' },
          adminActor.userId,
        );
      } catch (err: any) {
        expect(err.status).toBe(404);
        expect(err.code).toBe('RESOURCE_NOT_FOUND');
      }
    });

    it('throws DomainError 422 if reason is too short', async () => {
      const { commandService, rev1, adminActor } = await setup();

      await expect(
        commandService.hideReview(
          rev1.id,
          { reason: 'abc' },
          adminActor.userId,
        ),
      ).rejects.toThrow(DomainError);

      try {
        await commandService.hideReview(
          rev1.id,
          { reason: 'abc' },
          adminActor.userId,
        );
      } catch (err: any) {
        expect(err.status).toBe(422);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('AdminController endpoints', () => {
    it('GET /admin/reviews calls queryService with parsed params', async () => {
      const { controller } = await setup();
      const res = await controller.getReviews({
        page: '1',
        pageSize: '10',
        minRating: '3',
        maxRating: '5',
        q: 'tuyệt vời',
      });

      expect(res.items.length).toBe(1);
      expect(res.items[0]?.comment).toContain('tuyệt vời');
    });

    it('POST /admin/reviews/:id/hide calls commandService', async () => {
      const { controller, rev3, adminActor } = await setup();
      const res = await controller.hideReview(
        adminActor,
        rev3.id,
        { reason: 'Spam đánh giá không đúng thực tế' },
      );

      expect(res.comment).toContain('Spam đánh giá không đúng thực tế');
    });
  });
});
