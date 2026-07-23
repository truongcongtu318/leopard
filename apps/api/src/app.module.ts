import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

import { RequestContextMiddleware } from './common/request-context.middleware.js';
import { DocsModule } from './docs/docs.module.js';

@Module({
  imports: [DocsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
