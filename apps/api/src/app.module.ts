import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';

import { AuthModule } from './auth/auth.module.js';
import { DEFAULT_JSON_BODY_LIMIT_BYTES } from './common/body-size-limits.js';
import { createJsonBodyLimitMiddleware } from './common/json-body-limit.middleware.js';
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
import { NotificationsModule } from './notifications/notifications.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { AuditModule } from './audit/audit.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [AuditModule, AuthModule, DocsModule, DriversModule, HealthModule, MapsModule, OrdersModule, TrackingModule, MediaModule, NotificationsModule, PaymentsModule, FleetsModule, AdminModule, UsersModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');

    // Small, Express-default-sized JSON body cap for every route except
    // POST /driver/apply, which needs headroom for a base64 signature
    // image and gets its own larger cap in DriversModule.configure().
    consumer
      .apply(createJsonBodyLimitMiddleware({ limitBytes: DEFAULT_JSON_BODY_LIMIT_BYTES }))
      .exclude({ path: 'driver/apply', method: RequestMethod.POST })
      .forRoutes('*');
  }
}
