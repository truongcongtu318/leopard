import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

export abstract class DeliveryProofReader {
  async hasDeliveryProof(_orderId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
}

@Injectable()
export class PrismaDeliveryProofReader extends DeliveryProofReader {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async hasDeliveryProof(orderId: string): Promise<boolean> {
    const proof = await this.prisma.mediaObject.findFirst({
      where: {
        orderId,
        type: 'DELIVERY_PROOF',
      },
    });

    return proof !== null;
  }
}
