import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { DomainError } from '../common/domain-error.js';

export abstract class StorageProvider {
  abstract put(key: string, fileBuffer: Buffer, contentType: string): Promise<void>;
  abstract createReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  abstract delete(key: string): Promise<void>;
}

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  private readonly uploadDir: string;

  constructor() {
    super();
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
  }

  private resolveSafePath(key: string): string {
    const resolvedPath = path.resolve(this.uploadDir, key);
    const uploadRootWithSep = this.uploadDir.endsWith(path.sep)
      ? this.uploadDir
      : `${this.uploadDir}${path.sep}`;

    if (resolvedPath !== this.uploadDir && !resolvedPath.startsWith(uploadRootWithSep)) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Đường dẫn tệp không hợp lệ');
    }

    return resolvedPath;
  }

  async put(key: string, fileBuffer: Buffer, contentType: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    const dir = path.dirname(filePath);
    await fsPromises.mkdir(dir, { recursive: true });

    // Atomic write: write to temp then rename
    const tempFilePath = `${filePath}.${Date.now()}.tmp`;
    await fsPromises.writeFile(tempFilePath, fileBuffer);
    await fsPromises.rename(tempFilePath, filePath);
  }

  async createReadUrl(key: string, _expiresInSeconds: number = 3600): Promise<string> {
    // PUBLIC_FILES_BASE_URL (e.g. http://localhost:3000) makes the URL absolute
    // so browsers on a different origin (admin web) can load dev images.
    const base = (process.env.PUBLIC_FILES_BASE_URL ?? '').replace(/\/$/, '');
    return `${base}/files/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    try {
      await fsPromises.unlink(filePath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

@Injectable()
export class S3StorageProvider extends StorageProvider {
  private readonly config: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string | undefined;
  };
  private s3Client: unknown = null;

  constructor(config: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string | undefined;
  }) {
    super();
    this.config = config;
  }

  private async getClient(): Promise<any> {
    if (!this.s3Client) {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
        ...(this.config.endpoint ? { endpoint: this.config.endpoint, forcePathStyle: true } : {}),
      });
    }
    return this.s3Client;
  }

  async put(key: string, fileBuffer: Buffer, contentType: string): Promise<void> {
    const client = await this.getClient();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });
    await client.send(command);
  }

  async createReadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const client = await this.getClient();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    await client.send(command);
  }
}
