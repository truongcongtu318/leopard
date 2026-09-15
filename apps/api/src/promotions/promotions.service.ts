import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { PromotionVoucher } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

export interface ValidateVoucherResult {
  valid: boolean;
  discountVnd: number;
  voucher: PromotionVoucher;
}

export const SEED_PROMOTIONS = [
  {
    code: 'LEOPARD20',
    title: 'Giảm 20% chuyến hàng đầu tiên',
    description: 'Áp dụng cho mọi loại xe với đơn hàng đầu tiên của khách hàng mới.',
    discountType: 'PERCENT' as const,
    discountValue: 20,
    maxDiscountVnd: 50_000,
    minOrderAmountVnd: 0,
    expiresAt: new Date('2026-12-31T23:59:59.999Z'),
    isActive: true,
  },
  {
    code: 'VAN50K',
    title: 'Ưu đãi xe van 50.000 ₫',
    description: 'Giảm trực tiếp 50k khi đặt chuyến xe van vận chuyển hàng hóa.',
    discountType: 'FIXED' as const,
    discountValue: 50_000,
    maxDiscountVnd: 50_000,
    minOrderAmountVnd: 200_000,
    expiresAt: new Date('2026-12-31T23:59:59.999Z'),
    isActive: true,
  },
  {
    code: 'TRUCK100',
    title: 'Giảm 100.000 ₫ xe tải liên tỉnh',
    description: 'Hỗ trợ cước vận chuyển liên tỉnh cho doanh nghiệp và xưởng may.',
    discountType: 'FIXED' as const,
    discountValue: 100_000,
    maxDiscountVnd: 100_000,
    minOrderAmountVnd: 500_000,
    expiresAt: new Date('2026-12-31T23:59:59.999Z'),
    isActive: true,
  },
];

@Injectable()
export class PromotionsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultPromotions();
  }

  async seedDefaultPromotions(): Promise<void> {
    const count = await this.prisma.promotionVoucher.count();
    if (count === 0) {
      for (const promo of SEED_PROMOTIONS) {
        await this.prisma.promotionVoucher.upsert({
          where: { code: promo.code },
          create: promo,
          update: {},
        });
      }
    }
  }

  async getActivePromotions(): Promise<PromotionVoucher[]> {
    const now = new Date();
    return this.prisma.promotionVoucher.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async validateVoucher(code: string, orderAmountVnd: number): Promise<ValidateVoucherResult> {
    const normalizedCode = code.trim().toUpperCase();
    const voucher = await this.prisma.promotionVoucher.findUnique({
      where: { code: normalizedCode },
    });

    if (!voucher) {
      throw new DomainError('VOUCHER_NOT_FOUND', 404, 'Mã khuyến mãi không tồn tại');
    }

    if (!voucher.isActive) {
      throw new DomainError('VOUCHER_INACTIVE', 400, 'Mã khuyến mãi đã bị vô hiệu hóa');
    }

    const now = new Date();
    if (voucher.expiresAt && voucher.expiresAt <= now) {
      throw new DomainError('VOUCHER_EXPIRED', 400, 'Mã khuyến mãi đã hết hạn');
    }

    if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usageCount >= voucher.usageLimit) {
      throw new DomainError('VOUCHER_LIMIT_REACHED', 400, 'Mã khuyến mãi đã hết lượt sử dụng');
    }

    if (orderAmountVnd < voucher.minOrderAmountVnd) {
      throw new DomainError(
        'VOUCHER_MIN_ORDER_NOT_MET',
        400,
        `Giá trị đơn hàng tối thiểu để áp dụng mã là ${voucher.minOrderAmountVnd.toLocaleString('vi-VN')} ₫`,
      );
    }

    let discountVnd = 0;
    if (voucher.discountType === 'PERCENT') {
      discountVnd = Math.floor((orderAmountVnd * voucher.discountValue) / 100);
      if (voucher.maxDiscountVnd !== null && voucher.maxDiscountVnd !== undefined) {
        discountVnd = Math.min(discountVnd, voucher.maxDiscountVnd);
      }
    } else {
      discountVnd = voucher.discountValue;
    }

    // Không vượt quá orderAmountVnd
    discountVnd = Math.min(discountVnd, orderAmountVnd);

    return {
      valid: true,
      discountVnd,
      voucher,
    };
  }
}
