import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DriverDocumentService } from './driver-document.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

const actor: AuthenticatedActor = {
  userId: 'user-1',
  role: 'DRIVER',
  sessionId: 'session-1',
};

/** Minimal valid JPEG (magic bytes FF D8 FF + padding to reach 12 bytes). */
const jpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

function createMock(profile: { id: string } | null, existingDoc: unknown = null) {
  const storage = {
    put: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    createReadUrl: jest.fn(async (key: string) => `/files/${key}`),
  };
  const prisma = {
    driverProfile: { findUnique: jest.fn(async () => profile) },
    driverDocument: {
      findFirst: jest.fn(async () => existingDoc),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'doc-1',
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        ...data,
      })),
      findMany: jest.fn(async () => [
        {
          id: 'doc-1',
          type: 'LICENSE',
          contentType: 'image/jpeg',
          storageKey: 'drivers/p-1/license/x.jpg',
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
        },
      ]),
    },
  };
  return { storage, prisma };
}

describe('DriverDocumentService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads a KYC document, storing the file and metadata', async () => {
    const { storage, prisma } = createMock({ id: 'p-1' });
    const service = new DriverDocumentService(storage as never, prisma as never, 'LOCAL');

    const doc = await service.uploadDocument(actor, 'LICENSE', jpegBuffer, 'req-1');

    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(prisma.driverDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        driverProfileId: 'p-1',
        type: 'LICENSE',
        contentType: 'image/jpeg',
        provider: 'LOCAL',
        clientRequestId: 'req-1',
      }),
    });
    expect(doc).toMatchObject({ id: 'doc-1', type: 'LICENSE' });
  });

  it('rejects upload when the driver has no profile yet', async () => {
    const { storage, prisma } = createMock(null);
    const service = new DriverDocumentService(storage as never, prisma as never, 'LOCAL');

    await expect(
      service.uploadDocument(actor, 'LICENSE', jpegBuffer, 'req-1'),
    ).rejects.toMatchObject({ code: 'DRIVER_PROFILE_REQUIRED' });
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects a non-image file by magic bytes', async () => {
    const { storage, prisma } = createMock({ id: 'p-1' });
    const service = new DriverDocumentService(storage as never, prisma as never, 'LOCAL');
    const notAnImage = Buffer.from('this is definitely not an image at all');

    await expect(
      service.uploadDocument(actor, 'LICENSE', notAnImage, 'req-1'),
    ).rejects.toMatchObject({ code: 'MEDIA_UNSUPPORTED_TYPE' });
  });

  it('rejects a file larger than the limit', async () => {
    const { storage, prisma } = createMock({ id: 'p-1' });
    const service = new DriverDocumentService(storage as never, prisma as never, 'LOCAL');
    const huge = Buffer.alloc(11 * 1024 * 1024);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;

    await expect(
      service.uploadDocument(actor, 'LICENSE', huge, 'req-1'),
    ).rejects.toMatchObject({ code: 'MEDIA_FILE_TOO_LARGE' });
  });

  it('returns the existing document on idempotent re-upload', async () => {
    const existing = { id: 'doc-existing', type: 'LICENSE' };
    const { storage, prisma } = createMock({ id: 'p-1' }, existing);
    const service = new DriverDocumentService(storage as never, prisma as never, 'LOCAL');

    const doc = await service.uploadDocument(actor, 'LICENSE', jpegBuffer, 'req-1');

    expect(doc).toBe(existing);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('lists documents with signed read URLs', async () => {
    const { storage, prisma } = createMock({ id: 'p-1' });
    const service = new DriverDocumentService(storage as never, prisma as never, 'LOCAL');

    const docs = await service.listMyDocuments(actor);

    expect(docs).toEqual([
      {
        id: 'doc-1',
        type: 'LICENSE',
        contentType: 'image/jpeg',
        url: '/files/drivers/p-1/license/x.jpg',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
  });
});
