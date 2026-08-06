import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

export abstract class DeliveryProofReader {
  abstract hasDeliveryProof(orderId: string): Promise<boolean>;
}

@Injectable()
export class PrismaDeliveryProofReader extends DeliveryProofReader {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async hasDeliveryProof(orderId: string): Promise<boolean> {
    const proof = await this.prisma.mediaObject.findFirst({
      where: {
        orderId,
        type: 'DELIVERY_PROOF',
      },
    });

    return proof !== null;
  }
}
