import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type {
  DriverDocument,
  DriverDocumentType,
  ProviderSource,
} from '@prisma/client';

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

export interface DriverDocumentView {
  readonly id: string;
  readonly type: DriverDocumentType;
  readonly contentType: string;
  readonly url: string;
  readonly createdAt: string;
}

const READ_URL_TTL_SECONDS = 3600;

/** Uploads and reads driver KYC documents (license, vehicle registration, ID, photos). */
@Injectable()
export class DriverDocumentService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly prisma: PrismaService,
    private readonly providerSource: 'LOCAL' | 'S3',
  ) {}

  async uploadDocument(
    actor: AuthenticatedActor,
    type: DriverDocumentType,
    fileBuffer: Buffer,
    clientRequestId: string,
  ): Promise<DriverDocument> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: actor.userId },
    });
    if (!profile) {
      throw new DomainError(
        'DRIVER_PROFILE_REQUIRED',
        409,
        'Cần đăng ký hồ sơ tài xế trước khi tải giấy tờ',
      );
    }

    const existing = await this.prisma.driverDocument.findFirst({
      where: { driverProfileId: profile.id, type, clientRequestId },
    });
    if (existing) {
      return existing;
    }

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

    const checksumSha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const ext = IMAGE_MIME_TO_EXT[mime] ?? 'bin';
    const storageKey = `drivers/${profile.id}/${type.toLowerCase()}/${randomUUID()}.${ext}`;

    await this.storage.put(storageKey, fileBuffer, mime);

    try {
      return await this.prisma.driverDocument.create({
        data: {
          driverProfileId: profile.id,
          type,
          provider: this.providerSource as ProviderSource,
          storageKey,
          contentType: mime,
          sizeBytes: fileBuffer.length,
          checksumSha256,
          clientRequestId,
        },
      });
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => {});
      throw error;
    }
  }

  async listMyDocuments(actor: AuthenticatedActor): Promise<DriverDocumentView[]> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: actor.userId },
    });
    if (!profile) {
      return [];
    }
    return this.listByProfileId(profile.id);
  }

  /** Admin: list a specific driver's documents with signed read URLs. */
  async listDocumentsForUser(userId: string): Promise<DriverDocumentView[]> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return [];
    }
    return this.listByProfileId(profile.id);
  }

  private async listByProfileId(
    driverProfileId: string,
  ): Promise<DriverDocumentView[]> {
    const docs = await this.prisma.driverDocument.findMany({
      where: { driverProfileId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(docs.map((doc) => this.toView(doc)));
  }

  private async toView(doc: DriverDocument): Promise<DriverDocumentView> {
    const url = await this.storage.createReadUrl(doc.storageKey, READ_URL_TTL_SECONDS);
    return {
      id: doc.id,
      type: doc.type,
      contentType: doc.contentType,
      url,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
