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
      name: 'Admin Điều Phối',
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
      name: 'Công ty Giao Nhận',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  // Drivers
  const driverAvailableVan = await prisma.user.create({
    data: {
      phone: '+84901111111',
      name: 'Tài xế Van Rảnh',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });
  await prisma.driverProfile.create({
    data: {
      userId: driverAvailableVan.id,
      availability: 'AVAILABLE',
      vehicleType: 'VAN',
    },
  });

  const driverAvailableBike = await prisma.user.create({
    data: {
      phone: '+84902222222',
      name: 'Tài xế Xe máy Rảnh',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });
  await prisma.driverProfile.create({
    data: {
      userId: driverAvailableBike.id,
      availability: 'AVAILABLE',
      vehicleType: 'MOTORBIKE',
    },
  });

  const driverBusyVan = await prisma.user.create({
    data: {
      phone: '+84903333333',
      name: 'Tài xế Van Bận',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });
  await prisma.driverProfile.create({
    data: {
      userId: driverBusyVan.id,
      availability: 'BUSY',
      vehicleType: 'VAN',
    },
  });

  const driverDisabled = await prisma.user.create({
    data: {
      phone: '+84904444444',
      name: 'Tài xế Bị Khóa',
      role: 'DRIVER',
      status: 'DISABLED',
    },
  });
  await prisma.driverProfile.create({
    data: {
      userId: driverDisabled.id,
      availability: 'AVAILABLE',
      vehicleType: 'VAN',
    },
  });

  // Orders:
  // Order 1: REQUESTED, no driver, VAN, created 30 mins ago
  const order1 = await prisma.order.create({
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      customerId: customer1.id,
      driverId: null,
      status: 'REQUESTED',
      vehicleType: 'VAN',
      clientRequestId: 'client-req-ord-1',
    },
  });
  order1.createdAt = new Date(Date.now() - 30 * 60 * 1000);
  prisma.orders.set(order1.id, order1);

  // Stop for order 1
  await prisma.$queryRaw`
    INSERT INTO "OrderStop" ("orderId", type, sequence, address, lng, lat)
    VALUES (${order1.id}, ${'PICKUP'}, ${1}, ${'123 Đường Lê Lợi, Q1, TP.HCM'}, ${106.7}, ${10.7})
  `;
  await prisma.$queryRaw`
    INSERT INTO "OrderStop" ("orderId", type, sequence, address, lng, lat)
    VALUES (${order1.id}, ${'DROPOFF'}, ${2}, ${'456 Đường Nguyễn Huệ, Q1, TP.HCM'}, ${106.71}, ${10.71})
  `;

  // Order 2: REQUESTED, no driver, MOTORBIKE, created 10 mins ago
  const order2 = await prisma.order.create({
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      customerId: customer2.id,
      driverId: null,
      status: 'REQUESTED',
      vehicleType: 'MOTORBIKE',
      clientRequestId: 'client-req-ord-2',
    },
  });
  order2.createdAt = new Date(Date.now() - 10 * 60 * 1000);
  prisma.orders.set(order2.id, order2);

  await prisma.$queryRaw`
    INSERT INTO "OrderStop" ("orderId", type, sequence, address, lng, lat)
    VALUES (${order2.id}, ${'PICKUP'}, ${1}, ${'789 Đường Hai Bà Trưng, Q3, TP.HCM'}, ${106.69}, ${10.78})
  `;
  await prisma.$queryRaw`
    INSERT INTO "OrderStop" ("orderId", type, sequence, address, lng, lat)
    VALUES (${order2.id}, ${'DROPOFF'}, ${2}, ${'101 Đường Cách Mạng Tháng 8, Q10, TP.HCM'}, ${106.67}, ${10.77})
  `;

  // Order 3: ACCEPTED already has driver
  const order3 = await prisma.order.create({
    data: {
      id: '33333333-3333-4333-8333-333333333333',
      customerId: customer1.id,
      driverId: driverBusyVan.id,
      status: 'ACCEPTED',
      vehicleType: 'VAN',
      clientRequestId: 'client-req-ord-3',
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
    driverAvailableVan,
    driverAvailableBike,
    driverBusyVan,
    driverDisabled,
    order1,
    order2,
    order3,
  };
}

describe('AdminDispatch', () => {
  describe('AdminQueryService.getDispatchExceptions', () => {
    it('returns unassigned REQUESTED orders with waitingMinutes and matching candidate drivers', async () => {
      const { queryService, driverAvailableVan } = await setup();
      const res = await queryService.getDispatchExceptions({});

      expect(res.total).toBe(2);
      expect(res.items.length).toBe(2);

      const item1 = res.items.find((i) => i.orderId === '11111111-1111-4111-8111-111111111111');
      expect(item1).toBeDefined();
      expect(item1?.status).toBe('REQUESTED');
      expect(item1?.vehicleType).toBe('VAN');
      expect(item1?.orderCode).toBe('LP-1111');
      expect(item1?.pickupAddress).toBe('123 Đường Lê Lợi, Q1, TP.HCM');
      expect(item1?.dropoffAddress).toBe('456 Đường Nguyễn Huệ, Q1, TP.HCM');
      expect(item1?.waitingMinutes).toBeGreaterThanOrEqual(29);

      // Candidate drivers should only include ACTIVE & AVAILABLE drivers with vehicleType VAN
      expect(item1?.candidateDrivers.length).toBe(1);
      expect(item1?.candidateDrivers[0]?.driverId).toBe(driverAvailableVan.id);
      expect(item1?.candidateDrivers[0]?.vehicleType).toBe('VAN');
    });

    it('filters exceptions by vehicleType', async () => {
      const { queryService } = await setup();

      const vanRes = await queryService.getDispatchExceptions({ vehicleType: 'VAN' });
      expect(vanRes.total).toBe(1);
      expect(vanRes.items[0]?.vehicleType).toBe('VAN');

      const bikeRes = await queryService.getDispatchExceptions({ vehicleType: 'MOTORBIKE' });
      expect(bikeRes.total).toBe(1);
      expect(bikeRes.items[0]?.vehicleType).toBe('MOTORBIKE');
    });

    it('searches exceptions by customer name or stop address', async () => {
      const { queryService } = await setup();

      const searchCustomer = await queryService.getDispatchExceptions({ q: 'Công ty Giao Nhận' });
      expect(searchCustomer.total).toBe(1);
      expect(searchCustomer.items[0]?.orderId).toBe('22222222-2222-4222-8222-222222222222');

      const searchAddress = await queryService.getDispatchExceptions({ q: 'Lê Lợi' });
      expect(searchAddress.total).toBe(1);
      expect(searchAddress.items[0]?.orderId).toBe('11111111-1111-4111-8111-111111111111');
    });

    it('paginates exceptions accurately', async () => {
      const { queryService } = await setup();
      const res = await queryService.getDispatchExceptions({ page: 1, pageSize: 1 });

      expect(res.items.length).toBe(1);
      expect(res.total).toBe(2);
      expect(res.totalPages).toBe(2);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(1);
    });
  });

  describe('AdminCommandService.reassignOrder', () => {
    it('successfully reassigns order, updates status, creates history, logs audit, and marks driver BUSY', async () => {
      const { commandService, prisma, order1, driverAvailableVan, adminActor } = await setup();

      const reassigned = await commandService.reassignOrder(
        order1.id,
        {
          driverId: driverAvailableVan.id,
          reason: 'Điều phối thủ công cho đơn hàng chờ quá 30 phút',
        },
        adminActor,
      );

      expect(reassigned.driverId).toBe(driverAvailableVan.id);
      expect(reassigned.status).toBe('ACCEPTED');

      const updatedOrder = await prisma.order.findUnique({ where: { id: order1.id } });
      expect(updatedOrder?.driverId).toBe(driverAvailableVan.id);
      expect(updatedOrder?.status).toBe('ACCEPTED');

      const history = Array.from(prisma.orderStatusHistories.values()).find(
        (h) => h.orderId === order1.id && h.toStatus === 'ACCEPTED',
      );
      expect(history).toBeDefined();
      expect(history?.fromStatus).toBe('REQUESTED');
      expect(history?.actorId).toBe(adminActor.userId);
      expect(history?.reason).toBe('Điều phối thủ công cho đơn hàng chờ quá 30 phút');

      const audit = Array.from(prisma.auditLogs.values()).find(
        (a) => a.action === 'DISPATCH_MANUAL_REASSIGN' && a.resourceId === order1.id,
      );
      expect(audit).toBeDefined();
      expect(audit?.actorId).toBe(adminActor.userId);
      expect((audit?.metadata as any).driverId).toBe(driverAvailableVan.id);

      const driverProfile = await prisma.driverProfile.findUnique({
        where: { userId: driverAvailableVan.id },
      });
      expect(driverProfile?.availability).toBe('BUSY');
    });

    it('enforces idempotency with clientRequestId', async () => {
      const { commandService, order2, driverAvailableBike, adminActor } = await setup();
      const clientRequestId = 'idemp-reassign-order-2';

      const first = await commandService.reassignOrder(
        order2.id,
        {
          driverId: driverAvailableBike.id,
          reason: 'Điều phối thủ công lần 1',
          clientRequestId,
        },
        adminActor,
      );
      expect(first.status).toBe('ACCEPTED');

      const second = await commandService.reassignOrder(
        order2.id,
        {
          driverId: driverAvailableBike.id,
          reason: 'Điều phối thủ công lần 2 trùng clientRequestId',
          clientRequestId,
        },
        adminActor,
      );
      expect(second.id).toBe(order2.id);
    });

    it('throws DomainError 404 when order does not exist', async () => {
      const { commandService, driverAvailableVan, adminActor } = await setup();

      try {
        await commandService.reassignOrder(
          '99999999-9999-4999-8999-999999999999',
          {
            driverId: driverAvailableVan.id,
            reason: 'Lý do hợp lệ điều phối',
          },
          adminActor,
        );
        throw new Error('Expected reassignOrder to fail');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainError);
        expect(err.status).toBe(404);
        expect(err.code).toBe('RESOURCE_NOT_FOUND');
      }
    });

    it('throws DomainError 422 when order is not in REQUESTED status', async () => {
      const { commandService, order3, driverAvailableVan, adminActor } = await setup();

      try {
        await commandService.reassignOrder(
          order3.id,
          {
            driverId: driverAvailableVan.id,
            reason: 'Lý do hợp lệ điều phối đơn',
          },
          adminActor,
        );
        throw new Error('Expected reassignOrder to fail');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainError);
        expect(err.status).toBe(422);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });

    it('throws DomainError 404 when driver does not exist or is not a driver', async () => {
      const { commandService, order1, customer1, adminActor } = await setup();

      try {
        await commandService.reassignOrder(
          order1.id,
          {
            driverId: customer1.id, // Not a DRIVER
            reason: 'Lý do hợp lệ điều phối',
          },
          adminActor,
        );
        throw new Error('Expected reassignOrder to fail');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainError);
        expect(err.status).toBe(404);
        expect(err.code).toBe('RESOURCE_NOT_FOUND');
      }
    });

    it('throws DomainError 422 when driver is not ACTIVE', async () => {
      const { commandService, order1, driverDisabled, adminActor } = await setup();

      try {
        await commandService.reassignOrder(
          order1.id,
          {
            driverId: driverDisabled.id,
            reason: 'Lý do hợp lệ điều phối',
          },
          adminActor,
        );
        throw new Error('Expected reassignOrder to fail');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainError);
        expect(err.status).toBe(422);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });

    it('throws DomainError 422 when reason is less than 5 characters', async () => {
      const { commandService, order1, driverAvailableVan, adminActor } = await setup();

      try {
        await commandService.reassignOrder(
          order1.id,
          {
            driverId: driverAvailableVan.id,
            reason: 'abc',
          },
          adminActor,
        );
        throw new Error('Expected reassignOrder to fail');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainError);
        expect(err.status).toBe(422);
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('AdminController endpoints', () => {
    it('GET /admin/dispatch/exceptions parses query and returns exceptions', async () => {
      const { controller } = await setup();
      const res = await controller.getDispatchExceptions({
        page: '1',
        pageSize: '10',
        vehicleType: 'VAN',
      });

      expect(res.items.length).toBe(1);
      expect(res.items[0]?.vehicleType).toBe('VAN');
    });

    it('POST /admin/dispatch/orders/:id/reassign reassigns order', async () => {
      const { controller, order1, driverAvailableVan, adminActor } = await setup();
      const res = await controller.reassignOrder(
        adminActor,
        order1.id,
        {
          driverId: driverAvailableVan.id,
          reason: 'Điều phối khẩn cấp từ controller',
        },
      );

      expect(res.status).toBe('ACCEPTED');
      expect(res.driverId).toBe(driverAvailableVan.id);
    });
  });
});
