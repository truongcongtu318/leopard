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

  if (
    from === OrderStatus.DELIVERED ||
    from === OrderStatus.CANCELLED ||
    from === OrderStatus.INCIDENT_CANCELLED ||
    from === OrderStatus.RETURNED
  ) {
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
      (from === OrderStatus.REQUESTED ||
        from === OrderStatus.ACCEPTED ||
        from === OrderStatus.PICKING_UP ||
        from === OrderStatus.IN_TRANSIT) &&
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

  if (to === OrderStatus.INCIDENT_CANCELLED) {
    if (
      actorRole === Role.DRIVER &&
      (from === OrderStatus.ACCEPTED ||
        from === OrderStatus.PICKING_UP ||
        from === OrderStatus.IN_TRANSIT) &&
      cancelReason &&
      cancelReason.trim().length > 0
    ) {
      return;
    }

    if (
      actorRole === Role.ADMIN &&
      (from === OrderStatus.ACCEPTED ||
        from === OrderStatus.PICKING_UP ||
        from === OrderStatus.IN_TRANSIT)
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
    if (from === OrderStatus.IN_TRANSIT && to === OrderStatus.RETURNING) {
      return;
    }
    if (from === OrderStatus.RETURNING && to === OrderStatus.RETURNED) {
      return;
    }
    if (from === OrderStatus.IN_TRANSIT && to === OrderStatus.DELIVERED) {
      if (!hasDeliveryProof) {
        throw new DomainError(
          'DELIVERY_PROOF_REQUIRED',
          409,
          'Cần phải có ảnh bằng chứng giao hàng trước khi hoàn tất đơn hàng.',
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
