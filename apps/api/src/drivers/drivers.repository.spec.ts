// apps/api/src/drivers/drivers.repository.spec.ts
import { describe, expect, it, jest } from '@jest/globals';
import { DriversRepository } from './drivers.repository.js';

function createMockPrisma() {
  return {
    orderReview: {
      aggregate: jest.fn<any>(),
      findMany: jest.fn<any>(),
    },
    orderDispatchOffer: {
      groupBy: jest.fn<any>(),
    },
    order: {
      count: jest.fn<any>(),
    },
  };
}

describe('DriversRepository.getPerformanceStats', () => {
  it('computes rating average, acceptance rate, and cancellation rate', async () => {
    const prisma = createMockPrisma();
    prisma.orderReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.75 },
      _count: { _all: 12 },
    });
    prisma.orderDispatchOffer.groupBy.mockResolvedValue([
      { status: 'ACCEPTED', _count: { _all: 8 } },
      { status: 'DECLINED', _count: { _all: 2 } },
    ]);
    prisma.order.count
      .mockResolvedValueOnce(20) // totalAssigned
      .mockResolvedValueOnce(2); // cancelledAssigned
    prisma.orderReview.findMany.mockResolvedValue([
      { id: 'r1', orderId: 'o1', rating: 5, comment: 'Tốt', createdAt: new Date('2026-09-01') },
    ]);

    const repo = new DriversRepository(prisma as never);
    const result = await repo.getPerformanceStats('driver-1');

    expect(result.ratingAvg).toBe(4.75);
    expect(result.ratingCount).toBe(12);
    expect(result.acceptancePct).toBe(80); // 8 / (8 + 2) * 100
    expect(result.cancellationPct).toBe(10); // 2 / 20 * 100
    expect(result.recentReviews).toHaveLength(1);
  });

  it('returns null rates when there is no resolved offer or assigned order history', async () => {
    const prisma = createMockPrisma();
    prisma.orderReview.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { _all: 0 },
    });
    prisma.orderDispatchOffer.groupBy.mockResolvedValue([]);
    prisma.order.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.orderReview.findMany.mockResolvedValue([]);

    const repo = new DriversRepository(prisma as never);
    const result = await repo.getPerformanceStats('driver-1');

    expect(result.ratingAvg).toBeNull();
    expect(result.acceptancePct).toBeNull();
    expect(result.cancellationPct).toBeNull();
  });
});
