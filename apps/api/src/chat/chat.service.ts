import { Injectable } from '@nestjs/common';
import type { OrderMessage } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { SendMessageDto } from './dto/send-message.dto.js';

export interface OrderMessageDto {
  id: string;
  orderId: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderRole?: 'CUSTOMER' | 'DRIVER';
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrderMessages(userId: string, orderId: string): Promise<OrderMessage[]> {
    await this.verifyOrderParticipant(userId, orderId);

    return this.prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(userId: string, orderId: string, dto: SendMessageDto): Promise<OrderMessage> {
    const trimmed = dto?.body?.trim();
    if (!trimmed) {
      throw new DomainError('INVALID_MESSAGE', 400, 'Nội dung tin nhắn không được để trống');
    }

    await this.verifyOrderParticipant(userId, orderId);

    return this.prisma.orderMessage.create({
      data: {
        orderId,
        senderId: userId,
        body: trimmed,
      },
    });
  }

  async verifyOrderParticipant(userId: string, orderId: string): Promise<{ id: string; customerId: string; driverId: string | null }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, driverId: true },
    });

    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    const isCustomer = order.customerId === userId;
    const isDriver = order.driverId === userId;

    if (!isCustomer && !isDriver) {
      throw new DomainError('FORBIDDEN', 403, 'Bạn không có quyền tham gia cuộc trò chuyện này');
    }

    return order;
  }
}
