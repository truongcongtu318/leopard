import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  IMAGE_MIME_TO_EXT,
  MAX_IMAGE_SIZE_BYTES,
  detectImageMime,
  isAllowedImageMime,
} from '../media/image-validation.js';
import { StorageProvider } from '../media/storage.provider.js';

export interface AvatarUploadResult {
  readonly avatarStorageKey: string;
  readonly avatarContentType: string;
}

/** Uploads and replaces a user's profile avatar image. Not order-scoped, so it
 * writes directly onto the User row rather than through MediaObject (which
 * requires an orderId). */
@Injectable()
export class AvatarService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly prisma: PrismaService,
    private readonly providerSource: 'LOCAL' | 'S3',
  ) {}

  async uploadAvatar(
    actor: AuthenticatedActor,
    fileBuffer: Buffer,
  ): Promise<AvatarUploadResult> {
    if (fileBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new DomainError('MEDIA_FILE_TOO_LARGE', 413, 'File vượt quá giới hạn 10MB');
    }

    const mime = detectImageMime(fileBuffer);
    if (!mime || !isAllowedImageMime(mime)) {
      throw new DomainError(
        'MEDIA_UNSUPPORTED_TYPE',
        422,
        'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: actor.userId } });
    if (!user) {
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    const ext = IMAGE_MIME_TO_EXT[mime] ?? 'bin';
    const storageKey = `avatars/${actor.userId}/${randomUUID()}.${ext}`;

    await this.storage.put(storageKey, fileBuffer, mime);

    await this.prisma.user.update({
      where: { id: actor.userId },
      data: { avatarStorageKey: storageKey, avatarContentType: mime },
    });

    const previousKey = (user as { avatarStorageKey?: string | null }).avatarStorageKey;
    if (previousKey) {
      await this.storage.delete(previousKey).catch(() => {});
    }

    return { avatarStorageKey: storageKey, avatarContentType: mime };
  }
}
