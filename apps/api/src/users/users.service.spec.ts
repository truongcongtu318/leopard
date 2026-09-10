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
  it('throws UNAUTHORIZED when user does not exist', async () => {
    const { service } = makeService(null);
    await expect(service.completeProfile('u1', dto)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('requires a verified phone before completing', async () => {
    const { service } = makeService({ id: 'u1', phone: null });
    await expect(service.completeProfile('u1', dto)).rejects.toMatchObject({
      code: 'PHONE_REQUIRED',
      status: 409,
    });
  });

  it('sets onboardedAt and consents, returning profileComplete', async () => {
    const { service, update } = makeService({ id: 'u1', phone: '+84900000001' });
    const out = await service.completeProfile('u1', {
      ...dto,
      consentMarketing: true,
      consentThirdParty: false,
    });
    expect(out.profileComplete).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          name: 'An',
          email: 'a@b.com',
          onboardedAt: expect.any(Date),
          consentTermsAt: expect.any(Date),
          consentServiceAt: expect.any(Date),
          consentMarketing: true,
          consentThirdParty: false,
        }),
      }),
    );
  });

  it('clears email to null when a null email is provided', async () => {
    const { service, update } = makeService({ id: 'u1', phone: '+84900000001' });
    await expect(
      service.completeProfile('u1', { ...dto, email: null as unknown as string }),
    ).resolves.toBeDefined();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ email: null }),
      }),
    );
  });

  it('maps P2002 unique constraint violation on email to EMAIL_ALREADY_USED', async () => {
    const update = jest.fn().mockRejectedValue({
      code: 'P2002',
      meta: { target: ['email'] },
    });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1', phone: '+84900000001' }),
        update,
      },
    };
    const service = new UsersService(prisma as never);
    await expect(service.completeProfile('u1', dto)).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_USED',
      status: 409,
    });
  });
});
