import { Injectable } from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';

export interface OrderStatusChangedEvent {
  readonly orderId: string;
  readonly previousStatus: OrderStatus;
  readonly currentStatus: OrderStatus;
  readonly eventId: string;
  readonly occurredAt: string;
}

export type OrderStatusSubscriber = (event: OrderStatusChangedEvent) => void;

@Injectable()
export class OrderEventsPublisher {
  private readonly subscribers = new Set<OrderStatusSubscriber>();

  public subscribe(subscriber: OrderStatusSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  public publishStatusChanged(event: OrderStatusChangedEvent): void {
    for (const subscriber of this.subscribers) subscriber(event);
  }
}
