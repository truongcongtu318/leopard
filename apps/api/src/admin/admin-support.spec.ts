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
      status: 'IN_TRANSIT',
      priceVnd: 150000,
    },
  });

  await prisma.orderMessage.create({
    data: {
      orderId: order1.id,
      senderId: customer1.id,
      body: 'Tài xế ơi kiện hàng này có dễ vỡ không?',
      createdAt: new Date('2026-09-01T10:00:00Z'),
    },
  });

  await prisma.orderMessage.create({
    data: {
      orderId: order1.id,
      senderId: driver1.id,
      body: 'Dạ anh yên tâm, em đã chèn xốp cẩn thận rồi ạ!',
      createdAt: new Date('2026-09-01T10:05:00Z'),
    },
  });

  return {
    prisma,
    auditRepo,
    queryService,
    commandService,
    controller,
    adminActor,
    customer1,
    driver1,
    order1,
  };
}

describe('Admin Support Module (API & Query/Command)', () => {
  it('lists support conversations with latest message snippet', async () => {
    const { controller, order1 } = await setup();
    const result = await controller.getSupportConversations({});

    expect(result.items.length).toBeGreaterThanOrEqual(1);
    const conv = result.items.find((i) => i.orderId === order1.id);
    expect(conv).toBeDefined();
    expect(conv?.orderCode).toContain('LP-');
    expect(conv?.customerName).toBe('Nguyễn Văn Khách');
    expect(conv?.driverName).toBe('Lê Tài Xế');
    expect(conv?.lastMessageSnippet).toContain('Dạ anh yên tâm');
    expect(conv?.status).toBe('ACTIVE');
  });

  it('lists messages inside a specific conversation', async () => {
    const { controller, order1 } = await setup();
    const messages = await controller.getSupportMessages(order1.id);

    expect(messages.length).toBe(2);
    expect(messages[0]?.body).toBe('Tài xế ơi kiện hàng này có dễ vỡ không?');
    expect(messages[1]?.body).toContain('chèn xốp cẩn thận');
  });

  it('allows admin to send a support message and records audit log', async () => {
    const { controller, adminActor, order1, prisma } = await setup();
    const reqId = `client-sup-${Date.now()}`;

    const sent = await controller.sendSupportMessage(adminActor, order1.id, {
      body: 'Ban quản trị LEOPARD đã ghi nhận thông tin hỗ trợ đơn hàng này.',
      clientRequestId: reqId,
    });

    expect(sent.body).toContain('Ban quản trị LEOPARD đã ghi nhận');
    expect(sent.senderRole).toBe('ADMIN');

    // Messages now contains 3 messages
    const messages = await controller.getSupportMessages(order1.id);
    expect(messages.length).toBe(3);

    // Audit log recorded in prisma
    const logs = Array.from(prisma.auditLogs.values());
    const found = logs.find((l) => l.action === 'SUPPORT_MESSAGE_SENT');
    expect(found).toBeDefined();
    expect(found?.idempotencyRequestId).toBe(reqId);
  });

  it('rejects sending empty support message', async () => {
    const { controller, adminActor, order1 } = await setup();

    await expect(
      controller.sendSupportMessage(adminActor, order1.id, {
        body: '   ',
      }),
    ).rejects.toThrow(DomainError);
  });

  it('rejects sending support message to non-existent order', async () => {
    const { controller, adminActor } = await setup();

    await expect(
      controller.sendSupportMessage(adminActor, '00000000-0000-0000-0000-000000000000', {
        body: 'Xin chào',
      }),
    ).rejects.toThrow(DomainError);
  });
});
