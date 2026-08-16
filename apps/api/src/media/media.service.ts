import { Injectable } from '@nestjs/common';
import { StorageProvider } from './storage.provider.js';
import { MediaRepository } from './media.repository.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import type { MediaType, MediaObject, ProviderSource } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly mediaRepository: MediaRepository,
    private readonly prisma: PrismaService,
    private readonly providerSource: 'LOCAL' | 'S3',
  ) {}

  async uploadMedia(
    actor: AuthenticatedActor,
    orderId: string,
    type: MediaType,
    fileBuffer: Buffer,
    clientRequestId: string,
  ): Promise<MediaObject> {
    // 1. Authorize based on type
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (type === 'CARGO') {
      if (order.customerId !== actor.userId) {
        throw new DomainError('FORBIDDEN', 403, 'Chỉ khách hàng tạo đơn mới được upload ảnh hàng');
      }
    } else if (type === 'DELIVERY_PROOF') {
      if (order.driverId !== actor.userId) {
        throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế được phân công mới được upload bằng chứng giao hàng');
      }
    }

    // 2. Idempotency check
    const existing = await this.mediaRepository.findByIdempotencyKey(orderId, actor.userId, type, clientRequestId);
    if (existing) {
      return existing;
    }

    // 3. Validate file size
    if (fileBuffer.length > MAX_SIZE_BYTES) {
      throw new DomainError('MEDIA_FILE_TOO_LARGE', 413, 'File vượt quá giới hạn 10MB');
    }

    // 4. Validate MIME via magic bytes (inline to avoid ESM-only file-type dep)
    const detectedMime = detectMimeFromMagicBytes(fileBuffer);
    if (!detectedMime || !ALLOWED_MIMES.has(detectedMime)) {
      throw new DomainError('MEDIA_UNSUPPORTED_TYPE', 422, 'Chỉ chấp nhận file JPEG, PNG hoặc WebP');
    }

    // 5. Compute SHA-256 hash
    const checksumSha256 = createHash('sha256').update(fileBuffer).digest('hex');

    // 6. Generate storage key and upload
    const ext = MIME_TO_EXT[detectedMime] ?? 'bin';
    const storageKey = `orders/${orderId}/${type.toLowerCase()}/${randomUUID()}.${ext}`;

    await this.storageProvider.put(storageKey, fileBuffer, detectedMime);

    // 7. Persist metadata transactionally
    try {
      return await this.prisma.$transaction(async (tx) => {
        return this.mediaRepository.create(
          {
            orderId,
            uploaderId: actor.userId,
            type,
            provider: this.providerSource as ProviderSource,
            storageKey,
            contentType: detectedMime,
            sizeBytes: fileBuffer.length,
            checksumSha256,
            clientRequestId,
          },
          tx,
        );
      });
    } catch (error) {
      // Compensating delete on DB failure
      await this.storageProvider.delete(storageKey).catch(() => {});
      throw error;
    }
  }

  async getSignedUrl(actor: AuthenticatedActor, mediaId: string): Promise<{ url: string; expiresAt: string }> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy media');
    }

    const order = await this.prisma.order.findUnique({ where: { id: media.orderId } });
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    // Authorization: Customer owner, assigned Driver, Fleet Owner (via fleet policy upstream), Admin
    if (actor.role === 'CUSTOMER' && order.customerId !== actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập media này');
    }
    if (actor.role === 'DRIVER' && order.driverId !== actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập media này');
    }

    const expiresInSeconds = 3600;
    const url = await this.storageProvider.createReadUrl(media.storageKey, expiresInSeconds);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    return { url, expiresAt };
  }
}

/** Detect MIME type from magic bytes (JPEG, PNG, WebP) */
function detectMimeFromMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: starts with FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // WebP: starts with RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  return null;
}
