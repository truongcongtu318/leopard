import type { OrderStatus } from '@prisma/client';

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  clientRequestId?: string;
}
