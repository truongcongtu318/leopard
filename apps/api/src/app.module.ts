import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

import { AuthModule } from './auth/auth.module.js';
import { RequestContextMiddleware } from './common/request-context.middleware.js';
import { DocsModule } from './docs/docs.module.js';
import { DriversModule } from './drivers/drivers.module.js';
import { HealthModule } from './health/health.module.js';
import { MapsModule } from './maps/maps.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import { FleetsModule } from './fleets/fleets.module.js';
import { AdminModule } from './admin/admin.module.js';
import { MediaModule } from './media/media.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { AuditModule } from './audit/audit.module.js';

@Module({
  imports: [AuditModule, AuthModule, DocsModule, DriversModule, HealthModule, MapsModule, OrdersModule, TrackingModule, MediaModule, PaymentsModule, FleetsModule, AdminModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
