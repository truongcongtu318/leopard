// apps/api/src/admin/admin-withdrawal-review.service.spec.ts
import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { AdminWithdrawalReviewService } from './admin-withdrawal-review.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

const adminActor: AuthenticatedActor = { userId: 'admin-1', role: 'ADMIN', sessionId: 'sess-1' };

async function setup() {
  const prisma = new InMemoryPrismaService();
  const audit = new AuditService(new AuditRepository(prisma as never));
  const service = new AdminWithdrawalReviewService(prisma as never, audit);
  const driver = await prisma.user.create({ data: { phone: '+84900000009', role: 'DRIVER', status: 'ACTIVE' } });
  const request = await prisma.withdrawalRequest.create({
    data: { driverId: driver.id, amountVnd: 100000, bankName: 'MB Bank', bankAccountNumber: '111', bankAccountName: 'A' },
  });
  return { prisma, service, driverId: driver.id, requestId: request.id };
}

describe('AdminWithdrawalReviewService', () => {
  it('lists only PENDING requests', async () => {
    const { prisma, service, driverId } = await setup();
    await prisma.withdrawalRequest.create({
      data: { driverId, amountVnd: 5000, bankName: 'X', bankAccountNumber: '2', bankAccountName: 'B', status: 'APPROVED' },
    });

    const pending = await service.listPending();

    expect(pending).toHaveLength(1);
    expect(pending[0].amountVnd).toBe(100000);
  });

  it('approves a pending request and records the reviewer + audit log', async () => {
    const { prisma, service, requestId } = await setup();

    await service.approve(adminActor, requestId, 'Đã chuyển khoản thủ công qua MB Bank');

    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    expect(updated?.status).toBe('APPROVED');
    expect(updated?.reviewedById).toBe('admin-1');
    expect(updated?.reviewNote).toBe('Đã chuyển khoản thủ công qua MB Bank');

    const audits = Array.from(prisma.auditLogs.values()).filter((a) => a.resourceId === requestId);
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('WITHDRAWAL_APPROVED');
  });

  it('rejects a pending request with a note and records it', async () => {
    const { prisma, service, requestId } = await setup();

    await service.reject(adminActor, requestId, 'Thông tin ngân hàng không khớp hồ sơ');

    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    expect(updated?.status).toBe('REJECTED');
    expect(updated?.reviewNote).toBe('Thông tin ngân hàng không khớp hồ sơ');
  });

  it('throws 409 when approving a request that is no longer PENDING', async () => {
    const { service, requestId } = await setup();
    await service.approve(adminActor, requestId, 'Đã chuyển khoản');

    await expect(service.approve(adminActor, requestId, 'Đã chuyển khoản lần 2')).rejects.toMatchObject({
      code: 'WITHDRAWAL_ALREADY_REVIEWED',
    });
  });

  it('rejects a review note shorter than 5 characters', async () => {
    const { service, requestId } = await setup();

    await expect(service.approve(adminActor, requestId, 'ok')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws 404 for an unknown withdrawal id', async () => {
    const { service } = await setup();

    await expect(service.approve(adminActor, 'does-not-exist', 'Đã chuyển khoản')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
