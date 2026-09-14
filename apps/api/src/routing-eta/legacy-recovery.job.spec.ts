import { runLegacyRouteRecovery } from './legacy-recovery.job.js';

describe('runLegacyRouteRecovery', () => {
  it('creates a LEGACY_RECOVERED snapshot when the old JSON has valid geometry+coords', async () => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            activeRouteSnapshotId: null,
            status: 'IN_TRANSIT',
            routeSnapshot: { polyline: 'abc123', source: 'VIETMAP', calculatedAt: new Date().toISOString() },
            stops: [{ id: 'stop-1', latitude: 10.1, longitude: 106.1, sequence: 0 }],
          },
        ]),
      },
      orderRouteSnapshot: { create: jest.fn().mockResolvedValue({ id: 'snap-1' }) },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    const etaService = { bumpRevision: jest.fn() };

    const result = await runLegacyRouteRecovery(prisma as any, etaService as any, 'v1');

    expect(result).toEqual({ recovered: 1, enqueuedForRecompute: 0 });
    expect(prisma.orderRouteSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quality: 'LEGACY_RECOVERED', recoveryJobVersion: 'v1' }) }),
    );
  });

  it('does NOT fabricate a snapshot when geometry is missing — enqueues a recompute instead', async () => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'order-2', activeRouteSnapshotId: null, status: 'ACCEPTED', routeSnapshot: null, stops: [{ id: 'stop-2', latitude: 10.1, longitude: 106.1, sequence: 0 }] },
        ]),
      },
      orderRouteSnapshot: { create: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    const etaService = { bumpRevision: jest.fn() };

    const result = await runLegacyRouteRecovery(prisma as any, etaService as any, 'v1');

    expect(result).toEqual({ recovered: 0, enqueuedForRecompute: 1 });
    expect(prisma.orderRouteSnapshot.create).not.toHaveBeenCalled();
    expect(etaService.bumpRevision).toHaveBeenCalledWith(prisma, 'order-2');
  });
});
