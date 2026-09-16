import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import { AdminController } from './admin.controller.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import type { AdminUpdatePricingCommand } from '@leopard/shared';

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
      phone: '+84909111222',
      name: 'Võ Quản Trị Giá',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const actor: AuthenticatedActor = {
    userId: adminUser.id,
    role: 'ADMIN',
    sessionId: 'session-admin-pricing-1',
  };

  return {
    prisma,
    auditService,
    queryService,
    commandService,
    controller,
    adminUser,
    actor,
  };
}

describe('AdminDynamicPricing', () => {
  describe('getPricingConfig query', () => {
    it('returns default pricing config when no update has occurred yet', async () => {
      const { queryService } = await setup();

      const config = await queryService.getPricingConfig();

      expect(config.minimumFareVnd).toBe(10_000);
      expect(config.stopSurchargeVnd).toBe(2_500);
      expect(config.vehicleRates).toBeDefined();
      expect(config.vehicleRates.MOTORBIKE).toEqual({
        baseFareVnd: 10_000,
        perKmVnd: 3_500,
      });
      expect(config.vehicleRates.VAN).toEqual({
        baseFareVnd: 20_000,
        perKmVnd: 8_000,
      });
      expect(config.vehicleRates.TRUCK).toEqual({
        baseFareVnd: 35_000,
        perKmVnd: 12_000,
      });
      expect(config.updatedAt).toBeUndefined();
      expect(config.updatedByName).toBeUndefined();
    });
  });

  describe('updatePricingConfig command', () => {
    it('updates pricing config and writes audit log atomic', async () => {
      const { commandService, queryService, prisma, actor, adminUser } = await setup();

      const cmd: AdminUpdatePricingCommand = {
        minimumFareVnd: 12_000,
        stopSurchargeVnd: 3_000,
        vehicleRates: {
          MOTORBIKE: { baseFareVnd: 12_000, perKmVnd: 4_000, loadingFeeVnd: 15_000 },
          VAN: { baseFareVnd: 25_000, perKmVnd: 9_000, loadingFeeVnd: 30_000 },
          TRUCK: { baseFareVnd: 40_000, perKmVnd: 14_000, loadingFeeVnd: 50_000 },
        },
        reason: 'Điều chỉnh giá cước do biến động giá xăng dầu tháng 9/2026',
      };

      const result = await commandService.updatePricingConfig(cmd, actor);

      expect(result.minimumFareVnd).toBe(12_000);
      expect(result.stopSurchargeVnd).toBe(3_000);
      expect(result.vehicleRates.MOTORBIKE.baseFareVnd).toBe(12_000);
      expect(result.vehicleRates.MOTORBIKE.perKmVnd).toBe(4_000);
      expect(result.updatedAt).toBeDefined();
      expect(result.updatedByName).toBe(adminUser.name);

      // Verify AuditLog
      const audits = Array.from(prisma.auditLogs.values()).filter(
        (a) => a.action === 'PRICING_CONFIG_UPDATE',
      );
      expect(audits).toHaveLength(1);
      const audit = audits[0];
      expect(audit.actorId).toBe(actor.userId);
      expect(audit.resourceType).toBe('SYSTEM_CONFIG');

      const meta = audit.metadata as any;
      expect(meta.reason).toBe(cmd.reason);
      expect(meta.previousConfig.minimumFareVnd).toBe(10_000);
      expect(meta.newConfig.minimumFareVnd).toBe(12_000);

      // Query again to check persistence from audit log
      const updatedConfig = await queryService.getPricingConfig();
      expect(updatedConfig.minimumFareVnd).toBe(12_000);
      expect(updatedConfig.stopSurchargeVnd).toBe(3_000);
      expect(updatedConfig.vehicleRates.MOTORBIKE.baseFareVnd).toBe(12_000);
      expect(updatedConfig.updatedAt).toBe(audit.createdAt.toISOString());
      expect(updatedConfig.updatedByName).toBe(adminUser.name);
    });

    it('enforces idempotency with clientRequestId', async () => {
      const { commandService, prisma, actor } = await setup();

      const cmd: AdminUpdatePricingCommand = {
        minimumFareVnd: 15_000,
        stopSurchargeVnd: 4_000,
        vehicleRates: {
          MOTORBIKE: { baseFareVnd: 15_000, perKmVnd: 5_000 },
        },
        reason: 'Tăng giá thử nghiệm có idempotency requestId',
        clientRequestId: 'req-pricing-idempotency-001',
      };

      const first = await commandService.updatePricingConfig(cmd, actor);
      expect(first.minimumFareVnd).toBe(15_000);
      expect(prisma.auditLogs.size).toBe(1);

      // Second call with same clientRequestId
      const second = await commandService.updatePricingConfig(cmd, actor);
      expect(second.minimumFareVnd).toBe(15_000);
      expect(prisma.auditLogs.size).toBe(1); // No new audit log created
    });

    it('throws 422 VALIDATION_ERROR when reason is shorter than 5 characters or empty', async () => {
      const { commandService, actor } = await setup();

      await expect(
        commandService.updatePricingConfig(
          {
            minimumFareVnd: 10_000,
            stopSurchargeVnd: 2_500,
            vehicleRates: {
              MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_500 },
            },
            reason: 'abc',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);
    });

    it('throws 422 VALIDATION_ERROR when reason exceeds 500 characters', async () => {
      const { commandService, actor } = await setup();

      await expect(
        commandService.updatePricingConfig(
          {
            minimumFareVnd: 10_000,
            stopSurchargeVnd: 2_500,
            vehicleRates: {
              MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_500 },
            },
            reason: 'A'.repeat(501),
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);
    });

    it('throws 422 VALIDATION_ERROR when minimumFare or stopSurcharge is negative', async () => {
      const { commandService, actor } = await setup();

      await expect(
        commandService.updatePricingConfig(
          {
            minimumFareVnd: -100,
            stopSurchargeVnd: 2_500,
            vehicleRates: {
              MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_500 },
            },
            reason: 'Lý do hợp lệ trên 5 ký tự',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);

      await expect(
        commandService.updatePricingConfig(
          {
            minimumFareVnd: 10_000,
            stopSurchargeVnd: -500,
            vehicleRates: {
              MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_500 },
            },
            reason: 'Lý do hợp lệ trên 5 ký tự',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);
    });

    it('throws 422 VALIDATION_ERROR when vehicle rates are negative or empty', async () => {
      const { commandService, actor } = await setup();

      // Empty rates
      await expect(
        commandService.updatePricingConfig(
          {
            minimumFareVnd: 10_000,
            stopSurchargeVnd: 2_500,
            vehicleRates: {},
            reason: 'Lý do hợp lệ trên 5 ký tự',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);

      // Negative perKmVnd
      await expect(
        commandService.updatePricingConfig(
          {
            minimumFareVnd: 10_000,
            stopSurchargeVnd: 2_500,
            vehicleRates: {
              MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: -1 },
            },
            reason: 'Lý do hợp lệ trên 5 ký tự',
          },
          actor,
        ),
      ).rejects.toThrow(DomainError);
    });
  });

  describe('controller endpoints', () => {
    it('handles GET and PUT admin/pricing via controller', async () => {
      const { controller, actor } = await setup();

      const initial = await controller.getPricingConfig();
      expect(initial.minimumFareVnd).toBe(10_000);

      const putResult = await controller.updatePricingConfig(actor, {
        minimumFareVnd: 14_000,
        stopSurchargeVnd: 3_500,
        vehicleRates: {
          MOTORBIKE: { baseFareVnd: 14_000, perKmVnd: 4_500 },
          VAN: { baseFareVnd: 22_000, perKmVnd: 8_500 },
        },
        reason: 'Cập nhật giá qua AdminController test',
      });
      expect(putResult.minimumFareVnd).toBe(14_000);

      const updated = await controller.getPricingConfig();
      expect(updated.minimumFareVnd).toBe(14_000);
      expect(updated.vehicleRates.MOTORBIKE.baseFareVnd).toBe(14_000);
    });
  });
});
