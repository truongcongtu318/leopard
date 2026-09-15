import { describe, expect, it, jest } from '@jest/globals';

import { createDriverHistoryHttpAdapter } from './adapter';

describe('createDriverHistoryHttpAdapter', () => {
  it('maps GET /driver/orders/history into HistoryTripItem[]', async () => {
    const get = jest.fn(async () => ({
      items: [
        {
          id: 'order-1',
          reference: 'LP-ORDER1',
          status: 'DELIVERED',
          vehicleType: 'TRUCK',
          cargoNote: 'Xi măng',
          cargoWeightKg: 2000,
          distanceMeters: 14200,
          priceVnd: 170000,
          deliveredAt: '2026-08-15T14:32:00.000Z',
          updatedAt: '2026-08-15T14:32:00.000Z',
          createdAt: '2026-08-15T13:00:00.000Z',
          stops: [
            { id: 's1', type: 'PICKUP', sequence: 1, address: 'Kho Tân Bình', lat: 10.8, lng: 106.6 },
            { id: 's2', type: 'DROPOFF', sequence: 2, address: 'TP. Thủ Đức', lat: 10.85, lng: 106.75 },
          ],
          media: [{ id: 'm1', type: 'DELIVERY_PROOF', createdAt: '2026-08-15T14:30:00.000Z' }],
        },
      ],
      total: 42,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    }));
    const adapter = createDriverHistoryHttpAdapter({ get: get as any });

    const result = await adapter.getHistory();

    expect(get).toHaveBeenCalledWith('/driver/orders/history?page=1&pageSize=50');
    expect(result.total).toBe(42);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'order-1',
        reference: 'LP-ORDER1',
        origin: 'Kho Tân Bình',
        destination: 'TP. Thủ Đức',
        status: 'DELIVERED',
        hasProof: true,
        payoutAmount: 170000,
      }),
    ]);
  });

  it('falls back to DELIVERED for an unrecognized status rather than crashing', async () => {
    const get = jest.fn(async () => ({
      items: [
        {
          id: 'order-2',
          status: 'SOME_FUTURE_STATUS',
          createdAt: '2026-08-15T13:00:00.000Z',
          updatedAt: '2026-08-15T13:00:00.000Z',
          stops: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    }));
    const adapter = createDriverHistoryHttpAdapter({ get: get as any });

    const result = await adapter.getHistory();

    expect(result.items[0].status).toBe('DELIVERED');
    expect(result.items[0].hasProof).toBe(false);
  });
});
