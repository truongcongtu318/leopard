import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { DeliveryProofReader } from '../orders/domain/delivery-proof-reader.js';
import type { MediaType, MediaObject, Prisma } from '@prisma/client';

@Injectable()
export class MediaRepository implements DeliveryProofReader {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    orderId: string,
    uploaderId: string,
    type: MediaType,
    clientRequestId: string
  ): Promise<MediaObject | null> {
    return this.prisma.mediaObject.findFirst({
      where: {
        orderId,
        uploaderId,
        type,
        clientRequestId,
      },
    });
  }

  async create(
    data: Prisma.MediaObjectUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<MediaObject> {
    const client = tx ?? this.prisma;
    return client.mediaObject.create({
      data,
    });
  }

  async findById(id: string): Promise<MediaObject | null> {
    return this.prisma.mediaObject.findUnique({
      where: { id },
    });
  }

  async hasDeliveryProof(orderId: string): Promise<boolean> {
    const count = await this.prisma.mediaObject.count({
      where: {
        orderId,
        type: 'DELIVERY_PROOF',
      },
    });
    return count > 0;
  }

  async findByOrderId(orderId: string, skip: number = 0, take: number = 10): Promise<MediaObject[]> {
    return this.prisma.mediaObject.findMany({
      where: { orderId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }
}
