import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import { AdminController } from './admin.controller.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import type { AdminBroadcastCommand } from '@leopard/shared';

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
      phone: '+84909000001',
      name: 'Nguyễn Văn Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const customerUser1 = await prisma.user.create({
    data: {
      phone: '+84909000002',
      name: 'Trần Khách Hàng 1',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const customerUser2 = await prisma.user.create({
    data: {
      phone: '+84909000003',
      name: 'Lê Khách Hàng 2',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const disabledCustomer = await prisma.user.create({
    data: {
      phone: '+84909000004',
      name: 'Khách Bị Khóa',
      role: 'CUSTOMER',
      status: 'DISABLED',
    },
  });

  const driverUser1 = await prisma.user.create({
    data: {
      phone: '+84909000005',
      name: 'Phạm Tài Xế 1',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });

  const driverUser2 = await prisma.user.create({
    data: {
      phone: '+84909000006',
      name: 'Hoàng Tài Xế 2',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });

  const fleetOwnerUser = await prisma.user.create({
    data: {
      phone: '+84909000007',
      name: 'Vũ Chủ Đội Xe',
      role: 'FLEET_OWNER',
      status: 'ACTIVE',
    },
  });

  const actor: AuthenticatedActor = {
    userId: adminUser.id,
    role: 'ADMIN',
    sessionId: 'session-admin-1',
  };

  return {
    prisma,
    auditService,
    queryService,
    commandService,
    controller,
    adminUser,
    customerUser1,
    customerUser2,
    disabledCustomer,
    driverUser1,
    driverUser2,
    fleetOwnerUser,
    actor,
  };
}

describe('AdminBroadcastNotification', () => {
  describe('broadcastNotification command', () => {
    it('broadcasts to ALL active users (excluding disabled users)', async () => {
      const { commandService, prisma, actor } = await setup();

      const cmd: AdminBroadcastCommand = {
        audience: 'ALL',
        title: 'Bảo trì hệ thống toàn diện',
        body: 'Hệ thống sẽ tiến hành bảo trì định kỳ từ 0h đến 2h sáng mai.',
        type: 'SYSTEM',
      };

      const result = await commandService.broadcastNotification(cmd, actor);

      // Total active users: admin(1) + customer1(1) + customer2(1) + driver1(1) + driver2(1) + fleetOwner(1) = 6
      expect(result.success).toBe(true);
      expect(result.count).toBe(6);
      expect(result.audience).toBe('ALL');

      // Check notifications created in database
      const notifs = Array.from(prisma.notifications.values());
      expect(notifs).toHaveLength(6);
      expect(notifs.every((n) => n.title === 'Bảo trì hệ thống toàn diện')).toBe(true);
      expect(notifs.every((n) => n.type === 'SYSTEM')).toBe(true);

      // Check audit log created
      const audits = Array.from(prisma.auditLogs.values()).filter(
        (a) => a.action === 'NOTIFICATION_BROADCAST',
      );
      expect(audits).toHaveLength(1);
      expect(audits[0].actorId).toBe(actor.userId);
      expect(audits[0].resourceType).toBe('NOTIFICATION');
      expect((audits[0].metadata as any).count).toBe(6);
      expect((audits[0].metadata as any).audience).toBe('ALL');
    });

    it('broadcasts to CUSTOMER audience only', async () => {
      const { commandService, prisma, actor, customerUser1, customerUser2 } = await setup();

      const cmd: AdminBroadcastCommand = {
        audience: 'CUSTOMER',
        title: 'Ưu đãi cuối tuần 50%',
        body: 'Nhận ngay mã giảm giá cuối tuần cho toàn bộ chuyến giao hàng trong nội thành!',
        type: 'PROMO',
      };

      const result = await commandService.broadcastNotification(cmd, actor);

      // Active customers: customer1, customer2 (disabledCustomer excluded) = 2
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.audience).toBe('CUSTOMER');

      const notifs = Array.from(prisma.notifications.values());
      expect(notifs).toHaveLength(2);
      const recipientIds = notifs.map((n) => n.userId);
      expect(recipientIds).toContain(customerUser1.id);
      expect(recipientIds).toContain(customerUser2.id);
      expect(notifs[0].type).toBe('PROMO');
    });

    it('broadcasts to DRIVER audience only', async () => {
      const { commandService, prisma, actor, driverUser1, driverUser2 } = await setup();

      const cmd: AdminBroadcastCommand = {
        audience: 'DRIVER',
        title: 'Chính sách thưởng mới cho tài xế',
        body: 'Thưởng nóng 200.000đ khi hoàn thành từ 10 cuốc xe giao hàng trong ngày hôm nay!',
      };

      const result = await commandService.broadcastNotification(cmd, actor);

      // Active drivers: driver1, driver2 = 2
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.audience).toBe('DRIVER');

      const notifs = Array.from(prisma.notifications.values());
      expect(notifs).toHaveLength(2);
      const recipientIds = notifs.map((n) => n.userId);
      expect(recipientIds).toContain(driverUser1.id);
      expect(recipientIds).toContain(driverUser2.id);
      expect(notifs[0].type).toBe('SYSTEM'); // default fallback
    });

    it('broadcasts to FLEET_OWNER audience only', async () => {
      const { commandService, prisma, actor, fleetOwnerUser } = await setup();

      const cmd: AdminBroadcastCommand = {
        audience: 'FLEET_OWNER',
        title: 'Cập nhật đối soát hoa hồng đội xe',
        body: 'Bảng đối soát hoa hồng kỳ này đã được cập nhật trên cổng quản trị đối tác.',
        type: 'ORDER',
      };

      const result = await commandService.broadcastNotification(cmd, actor);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.audience).toBe('FLEET_OWNER');

      const notifs = Array.from(prisma.notifications.values());
      expect(notifs).toHaveLength(1);
      expect(notifs[0].userId).toBe(fleetOwnerUser.id);
    });

    it('enforces idempotency with clientRequestId', async () => {
      const { commandService, prisma, actor } = await setup();

      const cmd: AdminBroadcastCommand = {
        audience: 'CUSTOMER',
        title: 'Thông báo có clientRequestId',
        body: 'Nội dung kiểm tra tính duy nhất và không gửi lặp thông báo broadcast.',
        clientRequestId: 'req-broadcast-unique-123',
      };

      const first = await commandService.broadcastNotification(cmd, actor);
      expect(first.success).toBe(true);
      expect(first.count).toBe(2);

      const notifsFirstCount = prisma.notifications.size;
      const auditsFirstCount = prisma.auditLogs.size;

      // Second call with same clientRequestId
      const second = await commandService.broadcastNotification(cmd, actor);
      expect(second.success).toBe(true);
      expect(second.count).toBe(2);

      // Verify no extra notifications or audit logs were created
      expect(prisma.notifications.size).toBe(notifsFirstCount);
      expect(prisma.auditLogs.size).toBe(auditsFirstCount);
    });

    it('throws 422 VALIDATION_ERROR when title is too short or too long', async () => {
      const { commandService, actor } = await setup();

      // Title < 5 chars
      await expect(
        commandService.broadcastNotification(
          {
            audience: 'ALL',
            title: 'Alo',
            body: 'Nội dung hợp lệ trên 10 ký tự.',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);

      // Title > 200 chars
      await expect(
        commandService.broadcastNotification(
          {
            audience: 'ALL',
            title: 'A'.repeat(201),
            body: 'Nội dung hợp lệ trên 10 ký tự.',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);
    });

    it('throws 422 VALIDATION_ERROR when body is too short or too long', async () => {
      const { commandService, actor } = await setup();

      // Body < 10 chars
      await expect(
        commandService.broadcastNotification(
          {
            audience: 'ALL',
            title: 'Tiêu đề hợp lệ',
            body: 'Ngắn',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);

      // Body > 2000 chars
      await expect(
        commandService.broadcastNotification(
          {
            audience: 'ALL',
            title: 'Tiêu đề hợp lệ',
            body: 'B'.repeat(2001),
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);
    });

    it('throws 422 VALIDATION_ERROR when audience is invalid', async () => {
      const { commandService, actor } = await setup();

      await expect(
        commandService.broadcastNotification(
          {
            audience: 'UNKNOWN' as any,
            title: 'Tiêu đề hợp lệ',
            body: 'Nội dung thông báo hợp lệ trên 10 ký tự.',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);
    });
  });

  describe('getBroadcastHistory query & controller', () => {
    it('returns paginated broadcast history from audit logs', async () => {
      const { commandService, queryService, actor } = await setup();

      // Broadcast twice
      await commandService.broadcastNotification(
        {
          audience: 'CUSTOMER',
          title: 'Khuyến mãi đặc biệt thứ 1',
          body: 'Nội dung thông báo khuyến mãi thứ nhất.',
        },
        actor,
      );

      await commandService.broadcastNotification(
        {
          audience: 'DRIVER',
          title: 'Thưởng cuốc cao điểm thứ 2',
          body: 'Nội dung thông báo thưởng cuốc xe thứ hai.',
        },
        actor,
      );

      const history = await queryService.getBroadcastHistory({ page: 1, pageSize: 10 });

      expect(history.total).toBe(2);
      expect(history.items).toHaveLength(2);
      expect(history.items[0].title).toBe('Thưởng cuốc cao điểm thứ 2');
      expect(history.items[0].audience).toBe('DRIVER');
      expect(history.items[0].sentCount).toBe(2);
      expect(history.items[0].createdByName).toBe('Nguyễn Văn Admin');

      expect(history.items[1].title).toBe('Khuyến mãi đặc biệt thứ 1');
      expect(history.items[1].audience).toBe('CUSTOMER');
    });

    it('filters broadcast history by search query q', async () => {
      const { commandService, queryService, actor } = await setup();

      await commandService.broadcastNotification(
        {
          audience: 'CUSTOMER',
          title: 'Khuyến mãi hè sôi động',
          body: 'Mã giảm giá cho mọi đơn hàng mùa hè rực rỡ.',
        },
        actor,
      );

      await commandService.broadcastNotification(
        {
          audience: 'DRIVER',
          title: 'Thông báo thưởng tuần tài xế',
          body: 'Thưởng 500k cho tài xế hoạt động tích cực.',
        },
        actor,
      );

      const filtered = await queryService.getBroadcastHistory({ q: 'hè' });
      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0].title).toBe('Khuyến mãi hè sôi động');
    });

    it('calls controller endpoints properly', async () => {
      const { controller, actor } = await setup();

      const postResult = await controller.broadcastNotification(actor, {
        audience: 'CUSTOMER',
        title: 'Thông báo gửi qua controller',
        body: 'Nội dung được gửi thông qua AdminController.',
      });

      expect(postResult.success).toBe(true);
      expect(postResult.count).toBe(2);

      const getResult = await controller.getBroadcastHistory({ page: 1, pageSize: 10 });
      expect(getResult.total).toBe(1);
      expect(getResult.items[0].title).toBe('Thông báo gửi qua controller');
    });
  });
});
