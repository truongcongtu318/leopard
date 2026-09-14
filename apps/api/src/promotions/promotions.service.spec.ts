import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { DomainError } from '../common/domain-error.js';
import { PromotionsService, SEED_PROMOTIONS } from './promotions.service.js';

describe('PromotionsService', () => {
  let prisma: any;
  let service: PromotionsService;

  beforeEach(() => {
    prisma = {
      promotionVoucher: {
        count: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new PromotionsService(prisma);
  });

  describe('seedDefaultPromotions', () => {
    test('seeds 3 default vouchers when database table is empty', async () => {
      prisma.promotionVoucher.count.mockResolvedValue(0);
      prisma.promotionVoucher.upsert.mockResolvedValue({});

      await service.seedDefaultPromotions();

      expect(prisma.promotionVoucher.count).toHaveBeenCalledTimes(1);
      expect(prisma.promotionVoucher.upsert).toHaveBeenCalledTimes(3);
      expect(prisma.promotionVoucher.upsert).toHaveBeenCalledWith({
        where: { code: 'LEOPARD20' },
        create: SEED_PROMOTIONS[0],
        update: {},
      });
    });

    test('does not seed when vouchers already exist in database', async () => {
      prisma.promotionVoucher.count.mockResolvedValue(3);

      await service.seedDefaultPromotions();

      expect(prisma.promotionVoucher.count).toHaveBeenCalledTimes(1);
      expect(prisma.promotionVoucher.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getActivePromotions', () => {
    test('returns active and non-expired vouchers', async () => {
      const mockVouchers = [
        { code: 'LEOPARD20', isActive: true },
        { code: 'VAN50K', isActive: true },
      ];
      prisma.promotionVoucher.findMany.mockResolvedValue(mockVouchers);

      const result = await service.getActivePromotions();

      expect(result).toEqual(mockVouchers);
      expect(prisma.promotionVoucher.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('validateVoucher', () => {
    test('validates and calculates percentage discount with max limit (LEOPARD20)', async () => {
      prisma.promotionVoucher.findUnique.mockResolvedValue({
        code: 'LEOPARD20',
        isActive: true,
        discountType: 'PERCENT',
        discountValue: 20,
        maxDiscountVnd: 50_000,
        minOrderAmountVnd: 0,
        expiresAt: new Date(Date.now() + 86400000),
        usageLimit: null,
        usageCount: 0,
      });

      // 20% of 100k is 20k (< 50k max)
      const res1 = await service.validateVoucher('LEOPARD20', 100_000);
      expect(res1.valid).toBe(true);
      expect(res1.discountVnd).toBe(20_000);

      // 20% of 400k is 80k -> capped at 50k
      const res2 = await service.validateVoucher('leopard20', 400_000);
      expect(res2.valid).toBe(true);
      expect(res2.discountVnd).toBe(50_000);
    });

    test('validates and calculates fixed discount (VAN50K)', async () => {
      prisma.promotionVoucher.findUnique.mockResolvedValue({
        code: 'VAN50K',
        isActive: true,
        discountType: 'FIXED',
        discountValue: 50_000,
        maxDiscountVnd: 50_000,
        minOrderAmountVnd: 200_000,
        expiresAt: new Date(Date.now() + 86400000),
        usageLimit: 100,
        usageCount: 5,
      });

      const res = await service.validateVoucher('VAN50K', 250_000);
      expect(res.valid).toBe(true);
      expect(res.discountVnd).toBe(50_000);
    });

    test('throws 404 when voucher code not found', async () => {
      prisma.promotionVoucher.findUnique.mockResolvedValue(null);

      await expect(service.validateVoucher('UNKNOWN', 100_000)).rejects.toThrow(
        new DomainError('VOUCHER_NOT_FOUND', 404, 'Mã khuyến mãi không tồn tại'),
      );
    });

    test('throws 400 when voucher is inactive', async () => {
      prisma.promotionVoucher.findUnique.mockResolvedValue({
        code: 'INACTIVE',
        isActive: false,
      });

      await expect(service.validateVoucher('INACTIVE', 100_000)).rejects.toThrow(
        new DomainError('VOUCHER_INACTIVE', 400, 'Mã khuyến mãi đã bị vô hiệu hóa'),
      );
    });

    test('throws 400 when voucher is expired', async () => {
      prisma.promotionVoucher.findUnique.mockResolvedValue({
        code: 'EXPIRED',
        isActive: true,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.validateVoucher('EXPIRED', 100_000)).rejects.toThrow(
        new DomainError('VOUCHER_EXPIRED', 400, 'Mã khuyến mãi đã hết hạn'),
      );
    });

    test('throws 400 when min order amount is not met', async () => {
      prisma.promotionVoucher.findUnique.mockResolvedValue({
        code: 'VAN50K',
        isActive: true,
        discountType: 'FIXED',
        discountValue: 50_000,
        minOrderAmountVnd: 200_000,
        expiresAt: new Date(Date.now() + 86400000),
        usageLimit: null,
        usageCount: 0,
      });

      await expect(service.validateVoucher('VAN50K', 150_000)).rejects.toThrow(
        new DomainError('VOUCHER_MIN_ORDER_NOT_MET', 400, 'Giá trị đơn hàng tối thiểu để áp dụng mã là 200.000 ₫'),
      );
    });

    test('throws 400 when usage limit reached', async () => {
      prisma.promotionVoucher.findUnique.mockResolvedValue({
        code: 'LIMITED',
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
        usageLimit: 10,
        usageCount: 10,
        minOrderAmountVnd: 0,
      });

      await expect(service.validateVoucher('LIMITED', 100_000)).rejects.toThrow(
        new DomainError('VOUCHER_LIMIT_REACHED', 400, 'Mã khuyến mãi đã hết lượt sử dụng'),
      );
    });
  });
});
