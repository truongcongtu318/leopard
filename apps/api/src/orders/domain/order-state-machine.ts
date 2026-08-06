import { OrderStatus, Role } from '@prisma/client';
import { DomainError } from '../../common/domain-error.js';

export interface AssertOrderTransitionInput {
  from: OrderStatus;
  to: OrderStatus;
  actorRole: Role;
  hasDeliveryProof: boolean;
  cancelReason?: string;
}

export function assertOrderTransition(input: AssertOrderTransitionInput): void {
  const { from, to, actorRole, hasDeliveryProof, cancelReason } = input;

  if (from === OrderStatus.DELIVERED || from === OrderStatus.CANCELLED) {
    throw new DomainError('ORDER_INVALID_TRANSITION', 409, 'Không thể chuyển trạng thái đơn hàng.', {
      from,
      to,
    });
  }

  if (to === OrderStatus.CANCELLED) {
    if (actorRole === Role.CUSTOMER && from === OrderStatus.REQUESTED) {
      return;
    }

    if (
      actorRole === Role.ADMIN &&
      (from === OrderStatus.REQUESTED || from === OrderStatus.ACCEPTED || from === OrderStatus.PICKING_UP) &&
      cancelReason &&
      cancelReason.trim().length > 0
    ) {
      return;
    }

    throw new DomainError('ORDER_INVALID_TRANSITION', 409, 'Không thể chuyển trạng thái đơn hàng.', {
      from,
      to,
    });
  }

  if (actorRole === Role.DRIVER) {
    if (from === OrderStatus.REQUESTED && to === OrderStatus.ACCEPTED) {
      return;
    }
    if (from === OrderStatus.ACCEPTED && to === OrderStatus.PICKING_UP) {
      return;
    }
    if (from === OrderStatus.PICKING_UP && to === OrderStatus.IN_TRANSIT) {
      return;
    }
    if (from === OrderStatus.IN_TRANSIT && to === OrderStatus.DELIVERED) {
      if (!hasDeliveryProof) {
        throw new DomainError(
          'ORDER_INVALID_TRANSITION',
          409,
          'Cần phải có chứng từ giao hàng (delivery proof) trước khi hoàn tất đơn hàng.',
          { from, to },
        );
      }
      return;
    }
  }

  throw new DomainError('ORDER_INVALID_TRANSITION', 409, 'Không thể chuyển trạng thái đơn hàng.', {
    from,
    to,
  });
}
