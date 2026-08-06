import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { DriversController } from './drivers.controller.js';
import { DriversRepository } from './drivers.repository.js';
import { DriversService } from './drivers.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule],
  controllers: [DriversController],
  providers: [AccountStatusCache, DriversService, DriversRepository],
  exports: [DriversService, DriversRepository],
})
export class DriversModule {}
