import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { MapsModule } from '../maps/maps.module.js';
import { AcceptOrderService } from './accept-order.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersRepository } from './orders.repository.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, MapsModule],
  controllers: [OrdersController],
  providers: [AccountStatusCache, OrdersService, OrdersRepository, AcceptOrderService],
  exports: [OrdersService, OrdersRepository, AcceptOrderService],
})
export class OrdersModule {}
