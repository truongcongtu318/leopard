import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';
import { MediaRepository } from './media.repository.js';
import { StorageProvider, LocalStorageProvider, S3StorageProvider } from './storage.provider.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../database/prisma.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MediaController],
  providers: [
    MediaRepository,
    {
      provide: StorageProvider,
      useFactory: () => {
        const provider = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();
        if (provider === 's3') {
          return new S3StorageProvider({
            bucket: process.env.S3_BUCKET ?? 'test-bucket',
            region: process.env.S3_REGION ?? 'ap-southeast-1',
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'test-key',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'test-secret',
            endpoint: process.env.S3_ENDPOINT,
          });
        }
        return new LocalStorageProvider();
      },
    },
    {
      provide: MediaService,
      useFactory: (storage: StorageProvider, repo: MediaRepository, prisma: PrismaService) => {
        const provider = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();
        const providerSource = provider === 's3' ? ('S3' as const) : ('LOCAL' as const);
        return new MediaService(storage, repo, prisma, providerSource);
      },
      inject: [StorageProvider, MediaRepository, PrismaService],
    },
  ],
  exports: [MediaRepository, MediaService],
})
export class MediaModule {}
