import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { PaymentIntent, Prisma } from '@prisma/client';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveIntent(orderId: string, tx?: Prisma.TransactionClient): Promise<PaymentIntent | null> {
    const client = tx || this.prisma;
    return client.paymentIntent.findFirst({
      where: {
        orderId,
        status: { in: ['UNPAID', 'QR_CREATED'] },
      },
    });
  }

  async findByClientRequestId(orderId: string, clientRequestId: string, tx?: Prisma.TransactionClient): Promise<PaymentIntent | null> {
    const client = tx || this.prisma;
    return client.paymentIntent.findFirst({
      where: { orderId, clientRequestId },
    });
  }

  async findByConfirmationRequestId(confirmationRequestId: string, tx?: Prisma.TransactionClient): Promise<PaymentIntent | null> {
    const client = tx || this.prisma;
    return client.paymentIntent.findFirst({
      where: { confirmationRequestId },
    });
  }

  async create(data: Prisma.PaymentIntentUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<PaymentIntent> {
    const client = tx || this.prisma;
    return client.paymentIntent.create({ data });
  }

  async updateStatus(id: string, data: Prisma.PaymentIntentUncheckedUpdateInput, tx?: Prisma.TransactionClient): Promise<PaymentIntent> {
    const client = tx || this.prisma;
    return client.paymentIntent.update({
      where: { id },
      data,
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<PaymentIntent | null> {
    const client = tx || this.prisma;
    return client.paymentIntent.findUnique({
      where: { id },
    });
  }

  async findByOrderId(orderId: string, pagination?: { skip?: number; take?: number }, tx?: Prisma.TransactionClient): Promise<PaymentIntent[]> {
    const client = tx || this.prisma;
    return client.paymentIntent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      ...(pagination?.skip !== undefined ? { skip: pagination.skip } : {}),
      ...(pagination?.take !== undefined ? { take: pagination.take } : {}),
    });
  }
}
