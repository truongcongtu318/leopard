import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { MediaModule } from '../media/media.module.js';
import { StorageProvider } from '../media/storage.provider.js';
import { PrismaService } from '../database/prisma.service.js';
import { AvatarService } from './avatar.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, MediaModule],
  controllers: [UsersController],
  providers: [
    AccountStatusCache,
    UsersService,
    {
      provide: AvatarService,
      useFactory: (storage: StorageProvider, prisma: PrismaService) => {
        const providerSource =
          (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase() === 's3'
            ? ('S3' as const)
            : ('LOCAL' as const);
        return new AvatarService(storage, prisma, providerSource);
      },
      inject: [StorageProvider, PrismaService],
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
