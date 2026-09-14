import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainError } from '../common/domain-error.js';
import { ReviewsService } from './reviews.service.js';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockPrisma: any;

  const mockOrder = {
    id: 'order-1',
    customerId: 'cust-1',
    driverId: 'driver-1',
    status: 'DELIVERED',
  };

  const mockReview = {
    id: 'rev-1',
    orderId: 'order-1',
    customerId: 'cust-1',
    rating: 5,
    comment: 'Bác tài giao nhanh, cẩn thận',
    tipVnd: 20000,
    createdAt: new Date('2026-09-15T00:00:00Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
      },
      orderReview: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new ReviewsService(mockPrisma);
  });

  describe('createReview', () => {
    it('throws 404 when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview('cust-1', 'order-nonexistent', { rating: 5 }),
      ).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });
    });

    it('throws 403 when customerId does not match order.customerId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        customerId: 'cust-other',
      });

      await expect(
        service.createReview('cust-1', 'order-1', { rating: 5 }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('throws 400 when order status is not DELIVERED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'IN_TRANSIT',
      });

      await expect(
        service.createReview('cust-1', 'order-1', { rating: 5 }),
      ).rejects.toMatchObject({
        code: 'ORDER_NOT_DELIVERED',
        status: 400,
      });
    });

    it('throws 409 when order has already been reviewed by customer', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.createReview('cust-1', 'order-1', { rating: 5 }),
      ).rejects.toMatchObject({
        code: 'REVIEW_ALREADY_EXISTS',
        status: 409,
      });
    });

    it('creates review successfully when all checks pass', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderReview.findUnique.mockResolvedValue(null);
      mockPrisma.orderReview.create.mockResolvedValue(mockReview);

      const result = await service.createReview('cust-1', 'order-1', {
        rating: 5,
        comment: '  Bác tài giao nhanh, cẩn thận  ',
        tipVnd: 20000,
      });

      expect(mockPrisma.orderReview.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          customerId: 'cust-1',
          rating: 5,
          comment: 'Bác tài giao nhanh, cẩn thận',
          tipVnd: 20000,
        },
      });
      expect(result).toEqual(mockReview);
    });
  });

  describe('getReviewByOrderId', () => {
    it('throws 404 when review is not found', async () => {
      mockPrisma.orderReview.findFirst.mockResolvedValue(null);

      await expect(service.getReviewByOrderId('order-1')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });
    });

    it('returns review when found', async () => {
      mockPrisma.orderReview.findFirst.mockResolvedValue(mockReview);

      const result = await service.getReviewByOrderId('order-1');
      expect(mockPrisma.orderReview.findFirst).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
      });
      expect(result).toEqual(mockReview);
    });
  });
});
