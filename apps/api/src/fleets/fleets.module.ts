import { Module } from '@nestjs/common';
import { FleetScopeRepository } from './fleet-scope.repository.js';
import { FleetMembershipPolicy } from './fleet-membership.policy.js';
import { FleetOwnerService } from './fleet-owner.service.js';
import { FleetOwnerController } from './fleet-owner.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, OrdersModule, TrackingModule],
  controllers: [FleetOwnerController],
  providers: [FleetScopeRepository, FleetMembershipPolicy, FleetOwnerService],
  exports: [FleetMembershipPolicy],
})
export class FleetsModule {}
