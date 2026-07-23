import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

import { RequestContextMiddleware } from './common/request-context.middleware.js';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
