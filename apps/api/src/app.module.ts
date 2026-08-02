import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

import { RequestContextMiddleware } from './common/request-context.middleware.js';
import { DocsModule } from './docs/docs.module.js';
import { HealthModule } from './health/health.module.js';
import { MapsModule } from './maps/maps.module.js';

@Module({
  imports: [DocsModule, HealthModule, MapsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
