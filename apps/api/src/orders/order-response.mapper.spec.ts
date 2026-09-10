import { mapOrderResponse } from './order-response.mapper.js';

describe('mapOrderResponse', () => {
  it('omits media when the order has no mediaObjects relation loaded', () => {
    const order = {
      id: 'order-1',
      customerId: 'cust-1',
      driverId: null,
      status: 'REQUESTED',
      routeSnapshot: null,
      providerSource: null,
      distanceMeters: null,
      durationSeconds: null,
      priceVnd: null,
      etaSeconds: null,
      acceptedAt: null,
      pickingUpAt: null,
      inTransitAt: null,
      deliveredAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    } as never;

    const result = mapOrderResponse(order);

    expect(result.media).toBeUndefined();
  });

  it('maps mediaObjects to id, type, and ISO createdAt when the relation is loaded', () => {
    const order = {
      id: 'order-1',
      customerId: 'cust-1',
      driverId: 'drv-1',
      status: 'IN_TRANSIT',
      routeSnapshot: null,
      providerSource: null,
      distanceMeters: null,
      durationSeconds: null,
      priceVnd: null,
      etaSeconds: null,
      acceptedAt: null,
      pickingUpAt: null,
      inTransitAt: null,
      deliveredAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      mediaObjects: [
        {
          id: 'media-1',
          orderId: 'order-1',
          uploaderId: 'cust-1',
          type: 'CARGO',
          provider: 'LOCAL',
          storageKey: 'orders/order-1/cargo/x.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1024,
          checksumSha256: 'abc',
          clientRequestId: 'req-1',
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
        },
      ],
    } as never;

    const result = mapOrderResponse(order);

    expect(result.media).toEqual([
      { id: 'media-1', type: 'CARGO', createdAt: '2026-08-02T00:00:00.000Z' },
    ]);
  });
});
