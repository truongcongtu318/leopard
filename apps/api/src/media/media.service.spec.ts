import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { MediaService } from './media.service.js';
import { StorageProvider } from './storage.provider.js';
import { MediaRepository } from './media.repository.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';

describe('MediaService', () => {
  let service: MediaService;
  let mockStorageProvider: jest.Mocked<StorageProvider>;
  let mockRepository: jest.Mocked<MediaRepository>;
  let mockPrisma: any;

  beforeEach(() => {
    mockStorageProvider = {
      put: jest.fn<any>().mockResolvedValue(undefined),
      createReadUrl: jest.fn<any>().mockResolvedValue('https://signed-url'),
      delete: jest.fn<any>().mockResolvedValue(undefined),
    } as any;

    mockRepository = {
      findByIdempotencyKey: jest.fn<any>().mockResolvedValue(null),
      create: jest.fn<any>().mockResolvedValue({ id: 'm1' }),
      findById: jest.fn<any>().mockResolvedValue(null),
      hasDeliveryProof: jest.fn<any>().mockResolvedValue(false),
      findByOrderId: jest.fn<any>().mockResolvedValue([]),
    } as any;

    mockPrisma = {
      order: {
        findUnique: jest.fn<any>(),
      },
      $transaction: jest.fn<any>((cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    service = new MediaService(
      mockStorageProvider,
      mockRepository,
      mockPrisma,
      'S3',
    );
  });

  // Valid JPEG header: FF D8 FF E0 + padding to >= 12 bytes
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60]);

  describe('uploadMedia', () => {
    test('should return existing media if idempotency key matches', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u1' });
      mockRepository.findByIdempotencyKey.mockResolvedValue({ id: 'm1' } as any);

      const result = await service.uploadMedia(actor, 'o1', 'CARGO', validJpegBuffer, 'req1');
      expect(result.id).toBe('m1');
    });

    test('should throw 403 if customer uploads to wrong order', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u2' });

      await expect(service.uploadMedia(actor, 'o1', 'CARGO', validJpegBuffer, 'req1'))
        .rejects.toThrow('Chỉ khách hàng tạo đơn mới được upload ảnh hàng');
    });

    test('should throw 413 if file is too large', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u1' });
      mockRepository.findByIdempotencyKey.mockResolvedValue(null);
      
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      await expect(service.uploadMedia(actor, 'o1', 'CARGO', largeBuffer, 'req1'))
        .rejects.toThrow('File vượt quá giới hạn 10MB');
    });

    test('should throw 422 if invalid file type', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u1' });
      mockRepository.findByIdempotencyKey.mockResolvedValue(null);
      
      const invalidBuffer = Buffer.from('hello plain text');
      await expect(service.uploadMedia(actor, 'o1', 'CARGO', invalidBuffer, 'req1'))
        .rejects.toThrow('Chỉ chấp nhận file JPEG, PNG hoặc WebP');
    });

    test('should successfully upload and persist media', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u1' });
      mockRepository.findByIdempotencyKey.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({ id: 'm1' } as any);

      const result = await service.uploadMedia(actor, 'o1', 'CARGO', validJpegBuffer, 'req1');
      expect(mockStorageProvider.put).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('m1');
    });

    test('should perform compensating delete if DB fails', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u1' });
      mockRepository.findByIdempotencyKey.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.uploadMedia(actor, 'o1', 'CARGO', validJpegBuffer, 'req1'))
        .rejects.toThrow('DB Error');
      expect(mockStorageProvider.delete).toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    test('should throw 403 if unauthorized', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockRepository.findById.mockResolvedValue({ id: 'm1', orderId: 'o1', storageKey: 'key1' } as any);
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u2' });

      await expect(service.getSignedUrl(actor, 'm1'))
        .rejects.toThrow('Không có quyền truy cập media này');
    });

    test('should return signed URL for authorized actor', async () => {
      const actor: AuthenticatedActor = { userId: 'u1', role: 'CUSTOMER' };
      mockRepository.findById.mockResolvedValue({ id: 'm1', orderId: 'o1', storageKey: 'key1' } as any);
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', customerId: 'u1' });
      mockStorageProvider.createReadUrl.mockResolvedValue('https://signed-url');

      const result = await service.getSignedUrl(actor, 'm1');
      expect(result.url).toBe('https://signed-url');
      expect(mockStorageProvider.createReadUrl).toHaveBeenCalledWith('key1', 3600);
    });
  });
});
