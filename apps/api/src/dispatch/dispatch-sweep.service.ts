import { Injectable, Logger } from '@nestjs/common';

import { CancelOrderService } from '../orders/cancel-order.service.js';
import { OrderDispatchOffersRepository } from '../orders/order-dispatch-offers.repository.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { CANDIDATE_LIMIT, OFFER_TIMEOUT_SECONDS, REDISPATCH_RADII_M } from './dispatch.constants.js';
import { DispatchGateway } from './dispatch.gateway.js';
import { DispatchService } from './dispatch.service.js';

const NO_DRIVER_FOUND_REASON = 'Không tìm được tài xế phù hợp';

@Injectable()
export class DispatchSweepService {
  private readonly logger = new Logger(DispatchSweepService.name);

  constructor(
    private readonly offers: OrderDispatchOffersRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly dispatch: DispatchService,
    private readonly gateway: DispatchGateway,
    private readonly cancelOrderService: CancelOrderService,
  ) {}

  async runOnce(): Promise<void> {
    await this.offers.expireStalePending(OFFER_TIMEOUT_SECONDS);

    const orderIds = await this.offers.findOrderIdsNeedingRedispatch(OFFER_TIMEOUT_SECONDS);
    for (const orderId of orderIds) {
      try {
        await this.processOrder(orderId);
      } catch (error) {
        this.logger.warn(
          `Redispatch sweep failed for order ${orderId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async processOrder(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order || order.status !== 'REQUESTED' || order.driverId) {
      return; // resolved since the sweep query ran
    }

    const attemptIndex = Math.floor(
      (Date.now() - order.createdAt.getTime()) / (OFFER_TIMEOUT_SECONDS * 1000),
    );

    if (attemptIndex >= REDISPATCH_RADII_M.length) {
      await this.cancelOrderService.cancelUnmatchedOrder(orderId, NO_DRIVER_FOUND_REASON);
      return;
    }

    const pickup = order.stops.find((stop) => stop.type === 'PICKUP');
    const dropoff = order.stops.find((stop) => stop.type === 'DROPOFF');
    if (!pickup || !dropoff) {
      return; // defensive; every order always has both
    }

    const excludeDriverIds = await this.offers.findExcludedDriverIds(orderId);
    const candidates = await this.dispatch.findCandidates(
      { lat: pickup.lat, lng: pickup.lng },
      REDISPATCH_RADII_M[attemptIndex],
      CANDIDATE_LIMIT,
      order.vehicleType,
      excludeDriverIds,
    );
    if (candidates.length === 0) {
      return; // retried next tick as attemptIndex advances with real time
    }

    await this.offers.createPending(
      orderId,
      candidates.map((candidate) => candidate.userId),
    );
    this.gateway.emitOffersToCandidates(
      {
        orderId,
        pickup: { lat: pickup.lat, lng: pickup.lng },
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        vehicleType: order.vehicleType,
        priceVnd: order.priceVnd,
        distanceMeters: order.distanceMeters,
        durationSeconds: order.durationSeconds,
        cargoNote: order.cargoNote,
      },
      candidates,
    );
  }
}
