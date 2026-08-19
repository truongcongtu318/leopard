import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { MapsModule } from '../maps/maps.module.js';
import { AcceptOrderService } from './accept-order.service.js';
import { CancelOrderService } from './cancel-order.service.js';
import { DeliveryProofReader, PrismaDeliveryProofReader } from './domain/delivery-proof-reader.js';
import { OrdersController } from './orders.controller.js';
import { OrdersRepository } from './orders.repository.js';
import { OrdersService } from './orders.service.js';
import { UpdateOrderStatusService } from './update-order-status.service.js';
import { OrderEventsPublisher } from './order-events.publisher.js';

@Module({
  imports: [AuthModule, DatabaseModule, MapsModule],
  controllers: [OrdersController],
  providers: [
    AccountStatusCache,
    OrdersService,
    OrdersRepository,
    AcceptOrderService,
    UpdateOrderStatusService,
    OrderEventsPublisher,
    CancelOrderService,
    PrismaDeliveryProofReader,
    {
      provide: DeliveryProofReader,
      useClass: PrismaDeliveryProofReader,
    },
  ],
  exports: [
    OrdersService,
    OrdersRepository,
    AcceptOrderService,
    UpdateOrderStatusService,
    OrderEventsPublisher,
    CancelOrderService,
    DeliveryProofReader,
  ],
})
export class OrdersModule {}
