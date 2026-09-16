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

  const voucher1 = await prisma.promotionVoucher.create({
    data: {
      code: 'SUMMER20',
      title: 'Giảm 20% đơn giao mùa hè',
      description: 'Áp dụng cho mọi chuyến xe',
      discountType: 'PERCENT',
      discountValue: 20,
      maxDiscountVnd: 50000,
      minOrderAmountVnd: 100000,
      usageLimit: 500,
      usageCount: 15,
      expiresAt: new Date('2026-10-31T23:59:59Z'),
      isActive: true,
      createdAt: new Date('2026-09-01T08:00:00Z'),
    },
  });

  const voucher2 = await prisma.promotionVoucher.create({
    data: {
      code: 'GIAM30K',
      title: 'Giảm ngay 30.000đ',
      description: 'Áp dụng đơn từ 200k',
      discountType: 'FIXED',
      discountValue: 30000,
      maxDiscountVnd: null,
      minOrderAmountVnd: 200000,
      usageLimit: 200,
      usageCount: 50,
      expiresAt: new Date('2026-09-30T23:59:59Z'),
      isActive: false,
      createdAt: new Date('2026-09-05T09:00:00Z'),
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
    voucher1,
    voucher2,
  };
}

describe('AdminPromotions', () => {
  describe('AdminQueryService.getPromotions', () => {
    it('returns paginated promotions list with mapped properties', async () => {
      const { queryService } = await setup();
      const result = await queryService.getPromotions({ page: 1, pageSize: 10 });

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(2);

      const summer = result.items.find((v) => v.code === 'SUMMER20');
      expect(summer).toBeDefined();
      expect(summer?.title).toBe('Giảm 20% đơn giao mùa hè');
      expect(summer?.discountType).toBe('PERCENT');
      expect(summer?.discountValue).toBe(20);
      expect(summer?.maxDiscountVnd).toBe(50000);
      expect(summer?.minOrderAmountVnd).toBe(100000);
      expect(summer?.usageLimit).toBe(500);
      expect(summer?.usageCount).toBe(15);
      expect(summer?.isActive).toBe(true);
      expect(summer?.expiresAt).toBe(new Date('2026-10-31T23:59:59Z').toISOString());
    });

    it('filters promotions by isActive', async () => {
      const { queryService } = await setup();
      const activeOnly = await queryService.getPromotions({ isActive: true, page: 1, pageSize: 10 });
      expect(activeOnly.total).toBe(1);
      expect(activeOnly.items[0].code).toBe('SUMMER20');

      const inactiveOnly = await queryService.getPromotions({ isActive: false, page: 1, pageSize: 10 });
      expect(inactiveOnly.total).toBe(1);
      expect(inactiveOnly.items[0].code).toBe('GIAM30K');
    });

    it('filters promotions by discountType', async () => {
      const { queryService } = await setup();
      const fixedOnly = await queryService.getPromotions({ discountType: 'FIXED', page: 1, pageSize: 10 });
      expect(fixedOnly.total).toBe(1);
      expect(fixedOnly.items[0].code).toBe('GIAM30K');
    });

    it('searches promotions by q (code or title)', async () => {
      const { queryService } = await setup();
      const searchByCode = await queryService.getPromotions({ q: 'SUMMER', page: 1, pageSize: 10 });
      expect(searchByCode.total).toBe(1);
      expect(searchByCode.items[0].code).toBe('SUMMER20');

      const searchByTitle = await queryService.getPromotions({ q: '30.000đ', page: 1, pageSize: 10 });
      expect(searchByTitle.total).toBe(1);
      expect(searchByTitle.items[0].code).toBe('GIAM30K');
    });

    it('handles pagination correctly', async () => {
      const { queryService } = await setup();
      const page1 = await queryService.getPromotions({ page: 1, pageSize: 1 });
      expect(page1.total).toBe(2);
      expect(page1.items).toHaveLength(1);
      expect(page1.totalPages).toBe(2);

      const page2 = await queryService.getPromotions({ page: 2, pageSize: 1 });
      expect(page2.total).toBe(2);
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });
  });

  describe('AdminCommandService.createPromotion', () => {
    it('creates a promotion and records PROMOTION_CREATED audit log', async () => {
      const { commandService, adminActor, prisma } = await setup();
      const created = await commandService.createPromotion(adminActor, {
        code: 'NEWUSER50',
        title: 'Giảm 50% cho khách hàng mới',
        description: 'Tối đa 30k',
        discountType: 'PERCENT',
        discountValue: 50,
        maxDiscountVnd: 30000,
        minOrderAmountVnd: 50000,
        usageLimit: 1000,
        expiresAt: '2026-12-31T23:59:59Z',
      });

      expect(created.id).toBeDefined();
      expect(created.code).toBe('NEWUSER50');
      expect(created.isActive).toBe(true);
      expect(created.discountValue).toBe(50);

      const auditEntries = Array.from(prisma.auditLogs.values());
      const log = auditEntries.find((a) => a.action === 'PROMOTION_CREATED' && a.resourceId === created.id);
      expect(log).toBeDefined();
      expect(log?.actorId).toBe(adminActor.userId);
      expect(log?.resourceType).toBe('PromotionVoucher');
      expect(log?.metadata).toMatchObject({ code: 'NEWUSER50', discountType: 'PERCENT', discountValue: 50 });
    });

    it('throws 409 CONFLICT if promotion code already exists', async () => {
      const { commandService, adminActor } = await setup();
      await expect(
        commandService.createPromotion(adminActor, {
          code: 'summer20',
          title: 'Trùng mã',
          discountType: 'PERCENT',
          discountValue: 10,
        }),
      ).rejects.toThrow(DomainError);

      try {
        await commandService.createPromotion(adminActor, {
          code: 'summer20',
          title: 'Trùng mã',
          discountType: 'PERCENT',
          discountValue: 10,
        });
      } catch (err: any) {
        expect(err.status).toBe(409);
        expect(err.code).toBe('CONFLICT');
      }
    });
  });

  describe('AdminCommandService.updatePromotion', () => {
    it('updates promotion properties, toggles isActive, and records PROMOTION_UPDATED audit log', async () => {
      const { commandService, adminActor, voucher1, prisma } = await setup();
      const updated = await commandService.updatePromotion(adminActor, voucher1.id, {
        title: 'Tiêu đề đã sửa',
        discountValue: 25,
        isActive: false,
        reason: 'Tạm ngưng chương trình theo yêu cầu marketing',
      });

      expect(updated.title).toBe('Tiêu đề đã sửa');
      expect(updated.discountValue).toBe(25);
      expect(updated.isActive).toBe(false);

      const auditEntries = Array.from(prisma.auditLogs.values());
      const log = auditEntries.find((a) => a.action === 'PROMOTION_UPDATED' && a.resourceId === voucher1.id);
      expect(log).toBeDefined();
      expect(log?.actorId).toBe(adminActor.userId);
      expect(log?.metadata).toMatchObject({
        previous: { code: 'SUMMER20', isActive: true, discountValue: 20 },
        updated: { code: 'SUMMER20', isActive: false, discountValue: 25 },
        reason: 'Tạm ngưng chương trình theo yêu cầu marketing',
      });
    });

    it('throws 404 RESOURCE_NOT_FOUND if voucher does not exist', async () => {
      const { commandService, adminActor } = await setup();
      await expect(
        commandService.updatePromotion(adminActor, 'non-existent-uuid', { title: 'Test' }),
      ).rejects.toThrow(DomainError);
    });

    it('throws 409 CONFLICT if updating to a duplicate code', async () => {
      const { commandService, adminActor, voucher1 } = await setup();
      await expect(
        commandService.updatePromotion(adminActor, voucher1.id, { code: 'GIAM30K' }),
      ).rejects.toThrow(DomainError);
    });
  });

  describe('AdminController promotion endpoints', () => {
    it('delegates getPromotions, createPromotion, and updatePromotion', async () => {
      const { controller, adminActor, voucher1 } = await setup();

      const listRes = await controller.getPromotions({ page: '1', pageSize: '10', isActive: 'true' });
      expect(listRes.total).toBe(1);
      expect(listRes.items[0].code).toBe('SUMMER20');

      const createRes = await controller.createPromotion(adminActor, {
        code: 'PROMO100',
        title: 'Giảm 100k',
        discountType: 'FIXED',
        discountValue: 100000,
      });
      expect(createRes.code).toBe('PROMO100');

      const updateRes = await controller.updatePromotion(adminActor, voucher1.id, {
        isActive: false,
      });
      expect(updateRes.isActive).toBe(false);
    });
  });
});
