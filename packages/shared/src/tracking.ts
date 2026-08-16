import { parsePageQuery } from './api.js';
import type { Page, PageQuery, PageQueryInput } from './api.js';

// TrackingPointDto — phải khớp đúng field này (design §7)
export interface TrackingPointDto {
  id: string;
  orderId: string;
  driverId: string;
  clientPointId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  capturedAt: string;   // ISO UTC
  createdAt: string;    // ISO UTC
}

// Page envelope chuẩn — reuse `Page<T>` từ './api.js'
export type TrackingPointPage = Page<TrackingPointDto>;

// Query: from/to là ISO UTC timestamp; page/pageSize giới hạn ≤ 100
export interface TrackingPointQuery extends PageQuery {
  from?: Date;
  to?: Date;
}

// Input dạng raw string (controller nhận Query strings)
export interface TrackingPointQueryInput extends Record<string, unknown> {
  page?: string;
  pageSize?: string;
  from?: string;
  to?: string;
}

export function parseTrackingPointQuery(input: TrackingPointQueryInput | unknown): TrackingPointQuery {
  const baseQuery = parsePageQuery((input || {}) as PageQueryInput);
  
  const query: TrackingPointQuery = {
    ...baseQuery
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
