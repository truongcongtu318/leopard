import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { OrdersService } from './orders.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

/**
 * Regression cover for the booking vehicle type.
 *
 * Order.vehicleType and Order.cargoWeightKg are the columns dispatch and
 * accept-order read. `createOrder` used to pass both only inside routeSnapshot,
 * so the columns kept their defaults: every order was stored as MOTORBIKE and no
 * VAN or TRUCK driver could accept a booking the customer had made for their
 * vehicle — accept answered 422 VEHICLE_TYPE_MISMATCH.
 */
describe('OrdersService.createOrder', () => {
  const actor = { userId: 'customer-1', role: 'CUSTOMER' as const };
  let ordersRepository: any;
  let estimateTokenService: any;
  let eventsPublisher: any;
  let service: OrdersService;

  const dto = {
    pickup: { type: 'PICKUP', address: 'A', lat: 10.77, lng: 106.7 },
    dropoff: { type: 'DROPOFF', address: 'B', lat: 10.75, lng: 106.68 },
    stops: [],
    vehicleType: 'VAN',
    cargoWeightKg: 500,
    hasLoadingSupport: false,
    hasVatInvoice: false,
    estimateToken: 'token',
  } as unknown as CreateOrderDto;

  beforeEach(() => {
    const persistedAt = new Date('2026-09-15T00:05:00.000Z');
    ordersRepository = {
      findByClientRequestId: jest.fn(),
      // Shaped to satisfy mapOrderResponse, which the service calls on the way out.
      createOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        status: 'REQUESTED',
        vehicleType: 'VAN',
        cargoWeightKg: 500,
        cargoNote: null,
        customerId: 'customer-1',
        driverId: null,
        driver: null,
        priceVnd: 177_880,
        distanceMeters: 3420,
        durationSeconds: 420,
        etaSeconds: null,
        providerSource: 'DEMO',
        routeSnapshot: { polyline: 'abc', source: 'DEMO' },
        stops: [],
        statusHistory: [],
        mediaObjects: [],
        proofMediaId: null,
        acceptedAt: null,
        pickingUpAt: null,
        inTransitAt: null,
        deliveredAt: null,
        cancelledAt: null,
        incidentReason: null,
        incidentNote: null,
        incidentReportedAt: null,
        createdAt: persistedAt,
        updatedAt: persistedAt,
      }),
    };
    estimateTokenService = {
      verify: jest.fn().mockReturnValue({
        source: 'DEMO',
        distanceM: 3420,
        durationS: 420,
        estimatedPriceVnd: 177_880,
        polyline: 'abc',
        calculatedAt: new Date('2026-09-15T00:00:00.000Z'),
      }),
    };
    eventsPublisher = { publishRequested: jest.fn() };
    service = new OrdersService(ordersRepository, estimateTokenService, eventsPublisher);
  });

  test('persists the vehicle type and cargo weight the customer booked', async () => {
    await service.createOrder(actor, dto);

    expect(ordersRepository.createOrder).toHaveBeenCalledTimes(1);
    const params = ordersRepository.createOrder.mock.calls[0][0] as Record<string, unknown>;

    expect(params.vehicleType).toBe('VAN');
    expect(params.cargoWeightKg).toBe(500);
    // Still recorded on the snapshot, which is what the detail view renders.
    expect((params.routeSnapshot as Record<string, unknown>).vehicleType).toBe('VAN');
  });

  test('keeps the vehicle type on the dispatch event', async () => {
    await service.createOrder(actor, dto);

    expect(eventsPublisher.publishRequested).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleType: 'VAN' }),
    );
  });

  test('does not dispatch immediately when paymentMethod is VIETQR', async () => {
    await service.createOrder(actor, { ...dto, paymentMethod: 'VIETQR' });

    expect(ordersRepository.createOrder).toHaveBeenCalledTimes(1);
    expect(eventsPublisher.publishRequested).not.toHaveBeenCalled();
  });
});
