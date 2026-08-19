import type { GeoPoint } from './order.js';
import { parsePageQuery } from './api.js';
import type { Page, PageQuery, PageQueryInput } from './api.js';

export interface TrackingPoint extends GeoPoint {
  id: string;
  orderId: string;
  driverId: string;
  clientPointId: string;
  heading?: number | null;
  speed?: number | null;
  accuracyM?: number | null;
  capturedAt: string;
  createdAt?: string;
}

export interface TrackingPointDto {
  id: string;
  orderId: string;
  driverId: string;
  clientPointId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  capturedAt: string; // ISO UTC
  createdAt: string; // ISO UTC
}

export interface SendTrackingPointPayload {
  orderId: string;
  clientPointId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  capturedAt: string;
}

export interface TrackingHistoryResponse {
  orderId: string;
  points: TrackingPoint[];
  latestPoint: TrackingPoint | null;
}

export type TrackingPointPage = Page<TrackingPointDto>;

export interface TrackingPointQuery extends PageQuery {
  from?: Date;
  to?: Date;
}

export interface TrackingPointQueryInput extends Record<string, unknown> {
  page?: string;
  pageSize?: string;
  from?: string;
  to?: string;
}

export function parseTrackingPointQuery(input: TrackingPointQueryInput | unknown): TrackingPointQuery {
  const baseQuery = parsePageQuery((input || {}) as PageQueryInput);
  
  const query: TrackingPointQuery = {
    ...baseQuery,
  };

  const inputObj = (input || {}) as Record<string, unknown>;

  if (typeof inputObj.from === 'string') {
    const fromTime = Date.parse(inputObj.from);
    if (Number.isNaN(fromTime)) {
      throw new TypeError(`Invalid date format for 'from': ${inputObj.from}`);
    }
    query.from = new Date(fromTime);
  }

  if (typeof inputObj.to === 'string') {
    const toTime = Date.parse(inputObj.to);
    if (Number.isNaN(toTime)) {
      throw new TypeError(`Invalid date format for 'to': ${inputObj.to}`);
    }
    query.to = new Date(toTime);
  }

  return query;
}

