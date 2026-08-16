import type { Prisma } from '@prisma/client';
import { AuditService } from './audit.service.js';
import { AuditRepository } from './audit.repository.js';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

describe('AuditService.append', () => {
  const create = jest.fn();
  const tx = { auditLog: { create } } as unknown as Prisma.TransactionClient;
  const service = new AuditService(new AuditRepository());

  beforeEach(() => create.mockReset());

  test('appends a record with the provided transaction client', async () => {
    create.mockResolvedValueOnce({ id: 'a1' } as any);
    await service.append(
      { actorId: 'u1', action: 'UPDATE_USER_STATUS', resourceType: 'User', resourceId: 'r1' },
      tx,
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: 'u1', action: 'UPDATE_USER_STATUS' }),
    });
  });

  test('does not mutate the input metadata object', async () => {
    const metadata = { reason: 'x' };
    create.mockResolvedValueOnce({ id: 'a2' } as any);
    await service.append({ actorId: 'u1', action: 'A', resourceType: 'T', metadata }, tx);
    expect(metadata).toEqual({ reason: 'x' });
    expect(create).toHaveBeenCalled();
  });

  test('propagates a failed append so the caller transaction rolls back', async () => {
    create.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(
      service.append({ actorId: 'u1', action: 'A', resourceType: 'T' }, tx),
    ).rejects.toThrow('audit unavailable');
  });
});
