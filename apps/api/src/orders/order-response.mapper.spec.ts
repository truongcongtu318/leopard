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

  function orderWithStops(status: string) {
    return {
      id: 'order-1',
      customerId: 'cust-1',
      driverId: 'drv-1',
      status,
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
      stops: [
        {
          id: 'stop-1',
          orderId: 'order-1',
          type: 'PICKUP',
          sequence: 1,
          address: '123 Lê Lợi',
          contactName: 'Chị Lan',
          contactPhone: '0912345678',
          note: null,
          lat: 10.77,
          lng: 106.7,
        },
        {
          id: 'stop-2',
          orderId: 'order-1',
          type: 'DROPOFF',
          sequence: 2,
          address: '456 Nguyễn Huệ',
          contactName: 'Anh Bình',
          contactPhone: '0987654321',
          note: null,
          lat: 10.78,
          lng: 106.71,
        },
      ],
    } as never;
  }

  it('hides both contact name and phone for every stop while the order is REQUESTED (open pool)', () => {
    const result = mapOrderResponse(orderWithStops('REQUESTED'));

    for (const stop of result.stops ?? []) {
      expect(stop.contactName).toBeNull();
      expect(stop.contactPhone).toBeNull();
    }
  });

  it('fully redacts contact phone (not a partial mask) once the order reaches a terminal status', () => {
    for (const status of ['DELIVERED', 'CANCELLED', 'INCIDENT_CANCELLED', 'RETURNED']) {
      const result = mapOrderResponse(orderWithStops(status));
      for (const stop of result.stops ?? []) {
        expect(stop.contactPhone).toBeNull();
      }
    }
  });

  it('shows the real pickup phone (not masked) while ACCEPTED, and masks the dropoff phone', () => {
    const result = mapOrderResponse(orderWithStops('ACCEPTED'));
    const pickup = result.stops?.find((s) => s.type === 'PICKUP');
    const dropoff = result.stops?.find((s) => s.type === 'DROPOFF');

    expect(pickup?.contactPhone).toBe('0912345678');
    expect(dropoff?.contactPhone).toBe('098***4321');
  });

  it('shows the real dropoff phone (not masked) while IN_TRANSIT, and masks the pickup phone', () => {
    const result = mapOrderResponse(orderWithStops('IN_TRANSIT'));
    const pickup = result.stops?.find((s) => s.type === 'PICKUP');
    const dropoff = result.stops?.find((s) => s.type === 'DROPOFF');

    expect(dropoff?.contactPhone).toBe('0987654321');
    expect(pickup?.contactPhone).toBe('091***5678');
  });
});
