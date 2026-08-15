import { randomUUID } from 'node:crypto';
import type { TrackingPointDto } from '@leopard/shared';

export function sessionErrorEvent(code: string, message: string): {
  eventId: string; occurredAt: string; code: string; message: string;
} {
  return { 
    eventId: randomUUID(), 
    occurredAt: new Date().toISOString(), 
    code, 
    message 
  };
}

export function trackingPointEvent(payload: { orderId: string; point: TrackingPointDto }): {
  eventId: string; occurredAt: string; orderId: string; point: TrackingPointDto;
} {
  return { 
    eventId: payload.point.id, 
    occurredAt: payload.point.createdAt, 
    orderId: payload.orderId, 
    point: payload.point 
  };
}
