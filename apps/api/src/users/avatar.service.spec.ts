import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AvatarService } from './avatar.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

const actor: AuthenticatedActor = { userId: 'user-1', role: 'CUSTOMER', sessionId: 's-1' };

/** Minimal valid PNG (magic bytes 89 50 4E 47, padded to 12 bytes). */
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

function createMock() {
  const storage = {
    put: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    createReadUrl: jest.fn(async (key: string) => `/files/${key}`),
  };
  const prisma = {
    user: {
      findUnique: jest.fn(async () => ({ id: 'user-1', avatarStorageKey: null })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'user-1',
        ...data,
      })),
    },
  };
  return { storage, prisma };
}

describe('AvatarService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads a valid image and stores the key on the user row', async () => {
    const { storage, prisma } = createMock();
    const service = new AvatarService(storage as never, prisma as never, 'LOCAL');

    const result = await service.uploadAvatar(actor, pngBuffer);

    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        avatarStorageKey: expect.stringContaining('avatars/user-1/'),
        avatarContentType: 'image/png',
      }),
    });
    expect(result.avatarContentType).toBe('image/png');
  });

  it('rejects a file that is not a recognized image', async () => {
    const { storage, prisma } = createMock();
    const service = new AvatarService(storage as never, prisma as never, 'LOCAL');

    await expect(service.uploadAvatar(actor, Buffer.from('not an image'))).rejects.toThrow();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('deletes the old avatar file after successfully storing the new one', async () => {
    const { storage, prisma } = createMock();
    prisma.user.findUnique = jest.fn(async () => ({
      id: 'user-1',
      avatarStorageKey: 'avatars/user-1/old.jpg',
    })) as never;
    const service = new AvatarService(storage as never, prisma as never, 'LOCAL');

    await service.uploadAvatar(actor, pngBuffer);

    expect(storage.delete).toHaveBeenCalledWith('avatars/user-1/old.jpg');
  });
});
