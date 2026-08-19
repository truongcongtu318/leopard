import { Injectable } from '@nestjs/common';
import { FleetScopeRepository } from './fleet-scope.repository.js';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

@Injectable()
export class FleetMembershipPolicy {
  constructor(private readonly repository: FleetScopeRepository) {}

  async resolveFleetScope(actor: AuthenticatedActor): Promise<string> {
    if (actor.role !== 'FLEET_OWNER') {
      throw new DomainError('FORBIDDEN', 403, 'Must be a fleet owner');
    }

    const scope = await this.repository.findActiveFleetScope(actor.userId, 'OWNER');
    if (scope) {
      return scope.fleetId;
    }

    const membership = await this.repository.checkMembershipStatus(actor.userId, 'OWNER');
    if (membership && (membership.status === 'INVITED' || membership.status === 'REMOVED')) {
      throw new DomainError('FORBIDDEN', 403, 'Fleet membership is not active');
    }

    throw new DomainError('FORBIDDEN', 403, 'No fleet membership found');
  }

  async assertDriverInFleet(fleetId: string, driverUserId: string): Promise<void> {
    const scope = await this.repository.findActiveFleetScope(driverUserId, 'DRIVER');
    if (!scope || scope.fleetId !== fleetId) {
       throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Driver not found in this fleet');
    }
  }

  async assertOrderInFleet(fleetId: string, orderId: string): Promise<void> {
    const order = await this.repository.findOrderDriverFleet(orderId);
    if (!order || order.fleetId !== fleetId) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Order not found in this fleet');
    }
  }
}
