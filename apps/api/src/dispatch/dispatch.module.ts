import { Module } from '@nestjs/common';

import { DriversModule } from '../drivers/drivers.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';
import { DispatchGateway } from './dispatch.gateway.js';
import { DispatchService } from './dispatch.service.js';

@Module({
  imports: [OrdersModule, DriversModule, TrackingModule],
  providers: [DispatchService, DispatchGateway],
})
export class DispatchModule {}
