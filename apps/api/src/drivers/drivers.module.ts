import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DRIVER_APPLY_JSON_BODY_LIMIT_BYTES } from '../common/body-size-limits.js';
import { createJsonBodyLimitMiddleware } from '../common/json-body-limit.middleware.js';
import { DatabaseModule } from '../database/database.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { MediaModule } from '../media/media.module.js';
import { StorageProvider } from '../media/storage.provider.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PdfModule } from '../pdf/pdf.module.js';
import { DriversController } from './drivers.controller.js';
import { DriversRepository } from './drivers.repository.js';
import { DriversService } from './drivers.service.js';
import { DriverApplicationService } from './driver-application.service.js';
import { DriverContractService } from './driver-contract.service.js';
import { DriverDocumentService } from './driver-document.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule, MediaModule, PdfModule],
  controllers: [DriversController],
  providers: [
    AccountStatusCache,
    DriversService,
    DriverApplicationService,
    DriverContractService,
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
  exports: [DriversService, DriversRepository, DriverDocumentService, DriverContractService],
})
export class DriversModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // POST /driver/apply carries a base64 signature image and needs a
    // larger JSON body cap than the app-wide default (see
    // AppModule.configure(), which excludes exactly this route from that
    // smaller cap).
    consumer
      .apply(createJsonBodyLimitMiddleware({ limitBytes: DRIVER_APPLY_JSON_BODY_LIMIT_BYTES }))
      .forRoutes({ path: 'driver/apply', method: RequestMethod.POST });
  }
}
