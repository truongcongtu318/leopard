import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { MediaModule } from '../media/media.module.js';
import { StorageProvider } from '../media/storage.provider.js';
import { OrdersModule } from '../orders/orders.module.js';
import { DriversController } from './drivers.controller.js';
import { DriversRepository } from './drivers.repository.js';
import { DriversService } from './drivers.service.js';
import { DriverApplicationService } from './driver-application.service.js';
import { DriverDocumentService } from './driver-document.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule, MediaModule],
  controllers: [DriversController],
  providers: [
    AccountStatusCache,
    DriversService,
    DriverApplicationService,
    DriversRepository,
    {
      provide: DriverDocumentService,
      useFactory: (storage: StorageProvider, prisma: PrismaService) => {
        const providerSource =
          (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase() === 's3'
            ? ('S3' as const)
            : ('LOCAL' as const);
        return new DriverDocumentService(storage, prisma, providerSource);
      },
      inject: [StorageProvider, PrismaService],
    },
  ],
  exports: [DriversService, DriversRepository, DriverDocumentService],
})
export class DriversModule {}
