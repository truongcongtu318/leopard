import { UsersService } from './users.service.js';
import { DomainError } from '../common/domain-error.js';

function makeService(user: Record<string, unknown> | null) {
  const update = jest.fn().mockResolvedValue({
    id: 'u1', phone: '+84900000001', email: 'a@b.com', name: 'An',
    role: 'CUSTOMER', status: 'ACTIVE', onboardedAt: new Date(),
  });
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update },
  };
  return { service: new UsersService(prisma as never), update };
}

const dto = {
  name: 'An', email: 'a@b.com', consentTerms: true as const, consentService: true as const,
};

describe('UsersService.completeProfile', () => {
  it('requires a verified phone before completing', async () => {
    const { service } = makeService({ id: 'u1', phone: null });
    await expect(service.completeProfile('u1', dto)).rejects.toBeInstanceOf(DomainError);
  });

  it('sets onboardedAt and returns profileComplete', async () => {
    const { service, update } = makeService({ id: 'u1', phone: '+84900000001' });
    const out = await service.completeProfile('u1', dto);
    expect(out.profileComplete).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ name: 'An', email: 'a@b.com' }),
      }),
    );
  });
});
