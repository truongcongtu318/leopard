import { Injectable } from '@nestjs/common';
import type { OrderReview } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(
    customerId: string,
    orderId: string,
    dto: CreateReviewDto,
  ): Promise<OrderReview> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (order.customerId !== customerId) {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ người đặt đơn mới có thể đánh giá chuyến đi');
    }

    if (order.status !== 'DELIVERED') {
      throw new DomainError(
        'ORDER_NOT_DELIVERED',
        400,
        'Chỉ có thể đánh giá đơn hàng đã giao thành công',
      );
    }

    const existingReview = await this.prisma.orderReview.findUnique({
      where: {
        orderId_customerId: {
          orderId,
          customerId,
        },
      },
    });

    if (existingReview) {
      throw new DomainError('REVIEW_ALREADY_EXISTS', 409, 'Đơn hàng này đã được đánh giá');
    }

    return this.prisma.orderReview.create({
      data: {
        orderId,
        customerId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        tipVnd: dto.tipVnd ?? 0,
      },
    });
  }

  async getReviewByOrderId(orderId: string): Promise<OrderReview> {
    const review = await this.prisma.orderReview.findFirst({
      where: { orderId },
    });

    if (!review) {
      throw new DomainError(
        'RESOURCE_NOT_FOUND',
        404,
        'Không tìm thấy đánh giá cho đơn hàng này',
      );
    }

    return review;
  }
}
