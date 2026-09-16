import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AdminQueryService } from './admin-query.service.js';
import { AdminController } from './admin.controller.js';

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

  const admin = await prisma.user.create({
    data: {
      phone: '+84909999999',
      name: 'Admin Quản Trị',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const driver = await prisma.user.create({
    data: {
      phone: '+84901111111',
      name: 'Tài Xế Nguyễn',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  });

  const entry1 = await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'USER_STATUS_UPDATE',
      resourceType: 'User',
      resourceId: driver.id,
      requestId: 'req-12345',
      idempotencyRequestId: 'idem-12345',
      metadata: { previousStatus: 'ACTIVE', newStatus: 'DISABLED', reason: 'Vi phạm quy định' },
      createdAt: new Date('2026-09-01T08:00:00Z'),
    } as any,
  });

  const entry2 = await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'DRIVER_APPROVAL',
      resourceType: 'DriverProfile',
      resourceId: 'driver-profile-001',
      requestId: 'req-67890',
      idempotencyRequestId: 'idem-67890',
      metadata: { note: 'Hồ sơ đầy đủ' },
      createdAt: new Date('2026-09-05T10:00:00Z'),
    } as any,
  });

  const entry3 = await prisma.auditLog.create({
    data: {
      actorId: driver.id,
      action: 'DRIVER_LOCATION_UPDATE',
      resourceType: 'TrackingPoint',
      resourceId: 'point-001',
      requestId: null,
      idempotencyRequestId: null,
      metadata: { lat: 10.7769, lng: 106.7009 },
      createdAt: new Date('2026-09-10T12:00:00Z'),
    } as any,
  });

  const entry4 = await prisma.auditLog.create({
    data: {
      actorId: null,
      action: 'SYSTEM_MAINTENANCE',
      resourceType: 'System',
      resourceId: null,
      requestId: 'sys-req-001',
      idempotencyRequestId: null,
      metadata: { task: 'auto-cleanup' },
      createdAt: new Date('2026-09-12T00:00:00Z'),
    } as any,
  });

  return {
    prisma,
    queryService,
    controller,
    admin,
    driver,
    entry1,
    entry2,
    entry3,
    entry4,
  };
}

describe('AdminAudit', () => {
  describe('AdminQueryService.getAuditEntries', () => {
    it('returns paginated audit entries list with actor details and mapped properties', async () => {
      const { queryService, admin } = await setup();
      const result = await queryService.getAuditEntries({ page: 1, pageSize: 10 });

      expect(result.total).toBe(4);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(4);

      const item1 = result.items.find((i) => i.action === 'USER_STATUS_UPDATE');
      expect(item1).toBeDefined();
      expect(item1?.actorId).toBe(admin.id);
      expect(item1?.actorName).toBe('Admin Quản Trị');
      expect(item1?.actorRole).toBe('ADMIN');
      expect(item1?.resourceType).toBe('User');
      expect(item1?.requestId).toBe('req-12345');
      expect(item1?.idempotencyRequestId).toBe('idem-12345');
      expect(item1?.metadata).toEqual({ previousStatus: 'ACTIVE', newStatus: 'DISABLED', reason: 'Vi phạm quy định' });
      expect(item1?.createdAt).toBe(new Date('2026-09-01T08:00:00Z').toISOString());
    });

    it('filters audit entries by actorId', async () => {
      const { queryService, driver } = await setup();
      const result = await queryService.getAuditEntries({
        actorId: driver.id,
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].actorId).toBe(driver.id);
      expect(result.items[0].actorName).toBe('Tài Xế Nguyễn');
      expect(result.items[0].actorRole).toBe('DRIVER');
      expect(result.items[0].action).toBe('DRIVER_LOCATION_UPDATE');
    });

    it('filters audit entries by action', async () => {
      const { queryService } = await setup();
      const result = await queryService.getAuditEntries({
        action: 'DRIVER_APPROVAL',
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe('DRIVER_APPROVAL');
      expect(result.items[0].resourceType).toBe('DriverProfile');
    });

    it('filters audit entries by resourceType and resourceId', async () => {
      const { queryService } = await setup();
      const result = await queryService.getAuditEntries({
        resourceType: 'DriverProfile',
        resourceId: 'driver-profile-001',
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].resourceType).toBe('DriverProfile');
      expect(result.items[0].resourceId).toBe('driver-profile-001');
    });

    it('filters audit entries by date range (from, to)', async () => {
      const { queryService } = await setup();
      const result = await queryService.getAuditEntries({
        from: '2026-09-04T00:00:00Z',
        to: '2026-09-06T00:00:00Z',
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe('DRIVER_APPROVAL');
    });

    it('handles pagination correctly', async () => {
      const { queryService } = await setup();
      const page1 = await queryService.getAuditEntries({ page: 1, pageSize: 2 });
      expect(page1.total).toBe(4);
      expect(page1.items).toHaveLength(2);
      expect(page1.totalPages).toBe(2);

      const page2 = await queryService.getAuditEntries({ page: 2, pageSize: 2 });
      expect(page2.total).toBe(4);
      expect(page2.items).toHaveLength(2);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });

    it('handles audit entries with null actor (system actions)', async () => {
      const { queryService } = await setup();
      const result = await queryService.getAuditEntries({
        action: 'SYSTEM_MAINTENANCE',
        page: 1,
        pageSize: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items[0].actorId).toBeNull();
      expect(result.items[0].actorName).toBeNull();
      expect(result.items[0].actorRole).toBeNull();
    });
  });

  describe('AdminController.getAuditEntries', () => {
    it('delegates to queryService with parsed page query', async () => {
      const { controller, admin } = await setup();
      const result = await controller.getAuditEntries({
        page: '1',
        pageSize: '10',
        actorId: admin.id,
      });

      expect(result.total).toBe(2);
      expect(result.items.every((i) => i.actorId === admin.id)).toBe(true);
    });
  });
});
