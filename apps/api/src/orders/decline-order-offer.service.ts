import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { OrderDispatchOffersRepository } from './order-dispatch-offers.repository.js';

@Injectable()
export class DeclineOrderOfferService {
  constructor(private readonly offers: OrderDispatchOffersRepository) {}

  async declineOffer(actor: AuthenticatedActor, orderId: string): Promise<void> {
    if (actor.role !== 'DRIVER') {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế mới có thể từ chối đơn hàng');
    }

    const count = await this.offers.markDeclined(orderId, actor.userId);
    if (count === 0) {
      throw new DomainError(
        'RESOURCE_NOT_FOUND',
        404,
        'Không tìm thấy lời mời nhận đơn đang chờ phản hồi',
      );
    }
  }
}
