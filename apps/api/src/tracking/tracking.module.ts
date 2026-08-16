import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TrackingController } from './tracking.controller.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import { TrackingRepository } from './tracking.repository.js';
import { TrackingService } from './tracking.service.js';
import { OrdersModule } from '../orders/orders.module.js';
import { TrackingGateway } from './tracking.gateway.js';
import { SocketAuthAdapter } from './socket-auth.adapter.js';

@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule],
  controllers: [TrackingController],
  providers: [
    TrackingRateLimiter,
    TrackingRepository,
    TrackingService,
    TrackingGateway,
    SocketAuthAdapter,
  ],
  exports: [TrackingService],
})
export class TrackingModule {}
