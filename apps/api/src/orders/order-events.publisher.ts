import { Injectable } from '@nestjs/common';
import type { OrderStatus, VehicleType } from '@prisma/client';

export interface OrderStatusChangedEvent {
  readonly orderId: string;
  readonly previousStatus: OrderStatus;
  readonly currentStatus: OrderStatus;
  readonly eventId: string;
  readonly occurredAt: string;
}

export type OrderStatusSubscriber = (event: OrderStatusChangedEvent) => void;

export interface OrderRequestedEvent {
  readonly orderId: string;
  readonly pickup: { readonly lat: number; readonly lng: number };
  readonly pickupAddress: string;
  readonly dropoffAddress: string;
  readonly vehicleType: VehicleType;
  readonly priceVnd: number | null;
  readonly distanceMeters: number | null;
  readonly durationSeconds: number | null;
  readonly cargoNote: string | null;
  readonly occurredAt: string;
}

export type OrderRequestedSubscriber = (event: OrderRequestedEvent) => void;

@Injectable()
export class OrderEventsPublisher {
  private readonly subscribers = new Set<OrderStatusSubscriber>();
  private readonly requestedSubscribers = new Set<OrderRequestedSubscriber>();

  public subscribe(subscriber: OrderStatusSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  public publishStatusChanged(event: OrderStatusChangedEvent): void {
    for (const subscriber of this.subscribers) subscriber(event);
  }

  public subscribeRequested(subscriber: OrderRequestedSubscriber): () => void {
    this.requestedSubscribers.add(subscriber);
    return () => this.requestedSubscribers.delete(subscriber);
  }

  public publishRequested(event: OrderRequestedEvent): void {
    for (const subscriber of this.requestedSubscribers) subscriber(event);
  }
}
