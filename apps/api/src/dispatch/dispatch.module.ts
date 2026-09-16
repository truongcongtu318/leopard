import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { DriversModule } from '../drivers/drivers.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';
import { DispatchGateway } from './dispatch.gateway.js';
import { DispatchService } from './dispatch.service.js';
import { DispatchSweepService } from './dispatch-sweep.service.js';

const SWEEP_POLL_MS = 5_000;

@Module({
  imports: [OrdersModule, DriversModule, TrackingModule],
  providers: [DispatchService, DispatchGateway, DispatchSweepService],
})
export class DispatchModule implements OnModuleInit, OnModuleDestroy {
  private sweepTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly sweep: DispatchSweepService) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(
      () => void this.sweep.runOnce().catch(() => undefined),
      SWEEP_POLL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }
}
