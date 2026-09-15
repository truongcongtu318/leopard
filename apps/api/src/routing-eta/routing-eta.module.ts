import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { MapsModule } from '../maps/maps.module.js';
import { VehicleRoutingProfileService } from './vehicle-routing-profile.service.js';
import { RouteSnapshotService } from './route-snapshot.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { EtaService } from './eta.service.js';
import { RouteEtaRecomputeWorker } from './route-eta-recompute.worker.js';
import { StopProgressService } from './stop-progress.service.js';
import { RouteEtaController } from './route-eta.controller.js';
import { StopProgressController } from './stop-progress.controller.js';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';
import { OutboxNotifyPublisher } from './outbox-notify.publisher.js';

const RECOMPUTE_POLL_MS = 2_000;
const NOTIFY_POLL_MS = 500;

@Module({
  imports: [AuthModule, DatabaseModule, MapsModule],
  controllers: [RouteEtaController, StopProgressController],
  providers: [
    VehicleRoutingProfileService, RouteSnapshotService, OutboxRepository, EtaService,
    RouteEtaRecomputeWorker, StopProgressService, RouteEtaRealtimeEmitterImpl, OutboxNotifyPublisher,
  ],
  exports: [EtaService, RouteEtaRealtimeEmitterImpl, VehicleRoutingProfileService, RouteSnapshotService],
})
export class RoutingEtaModule implements OnModuleInit, OnModuleDestroy {
  private recomputeTimer: ReturnType<typeof setInterval> | undefined;
  private notifyTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly recomputeWorker: RouteEtaRecomputeWorker,
    private readonly notifyPublisher: OutboxNotifyPublisher,
  ) {}

  onModuleInit(): void {
    this.recomputeTimer = setInterval(
      () => void this.recomputeWorker.runOnce().catch(() => undefined),
      RECOMPUTE_POLL_MS,
    );
    this.notifyTimer = setInterval(
      () => void this.notifyPublisher.runOnce().catch(() => undefined),
      NOTIFY_POLL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.recomputeTimer) clearInterval(this.recomputeTimer);
    if (this.notifyTimer) clearInterval(this.notifyTimer);
  }
}
