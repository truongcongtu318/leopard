import {
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  Post,
  Query,
  UseFilters,
  UseGuards,
  type ExecutionContext,
} from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';

import {
  getAuthenticatedActor,
  type AuthenticatedActor,
} from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import { MapsService } from './maps.service.js';
import type { OrderEstimateResponse } from './maps.service.js';
import type {
  GeoPoint,
  MapProviderSource,
  PlaceCandidate,
  RouteInput,
} from './providers/map-provider.js';

type VehicleType = 'MOTORBIKE' | 'VAN' | 'TRUCK';
type StopType = 'PICKUP' | 'STOP' | 'DROPOFF';

interface EstimateStop {
  type: StopType;
  address: string;
  lat: number;
  lng: number;
}

interface EstimateRequestDto {
  pickup: EstimateStop;
  stops: EstimateStop[];
  dropoff: EstimateStop;
  vehicleType: VehicleType;
}

interface SearchResponse {
  source: MapProviderSource;
  results: Array<{
    placeId: string;
    label: string;
    address?: string;
    lat: number;
    lng: number;
  }>;
}

interface GeocodeResponse {
  source: MapProviderSource;
  placeId: string;
  label: string;
  address?: string;
  lat: number;
  lng: number;
}

interface ValidationIssue {
  field: string;
  messages: string[];
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const ROUTE_RATE_LIMITS: ReadonlyArray<{
  method: 'GET' | 'POST';
  pathPrefix: string;
  maxRequests: number;
}> = [
  { method: 'GET', pathPrefix: '/maps/search', maxRequests: 30 },
  { method: 'GET', pathPrefix: '/maps/geocode/', maxRequests: 30 },
  { method: 'POST', pathPrefix: '/orders/estimate', maxRequests: 10 },
];

@Injectable()
export class MapsRateLimitGuard implements CanActivate {
  private readonly requestTimestampsByCaller = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      path?: string;
      ip?: string;
      authenticatedActor?: AuthenticatedActor;
    }>();
    const rateLimit = this.resolveLimit(request.method, request.path);

    if (rateLimit === null) {
      return true;
    }

    const now = Date.now();
    const callerKey = this.callerKey(request);
    const history = this.requestTimestampsByCaller.get(callerKey) ?? [];
    const activeHistory = history.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

    if (activeHistory.length >= rateLimit.maxRequests) {
      this.requestTimestampsByCaller.set(callerKey, activeHistory);
      throw new DomainError('RATE_LIMITED', 429, 'Rate limit exceeded');
    }

    activeHistory.push(now);
    this.requestTimestampsByCaller.set(callerKey, activeHistory);

    return true;
  }

  private resolveLimit(
    method: string | undefined,
    path: string | undefined,
  ): (typeof ROUTE_RATE_LIMITS)[number] | null {
    if (typeof method !== 'string' || typeof path !== 'string') {
      return null;
    }

    const normalizedPath = path.replace(/^\/api\/v1(?=\/)/, '');

    return (
      ROUTE_RATE_LIMITS.find(
        (entry) =>
          entry.method === method && normalizedPath.startsWith(entry.pathPrefix),
      ) ?? null
    );
  }

  private callerKey(request: {
    ip?: string;
    authenticatedActor?: AuthenticatedActor;
  }): string {
    const actor = getAuthenticatedActor(request);
    const ip = request.ip?.trim() || 'unknown';

    if (!actor) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    return `actor:${actor.userId}:${ip}`;
  }
}

@Controller()
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, MapsRateLimitGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('maps/search')
  async search(@Query('q') rawQuery: unknown): Promise<SearchResponse> {
    const query = validateSearchQuery(rawQuery);
    const results = await this.mapsService.search(query);

    return {
      source: results[0]?.source ?? this.mapsService.defaultSource(),
      results: results.map(mapPlaceCandidate),
    };
  }

  @Get('maps/geocode/:placeId')
  async geocode(@Param('placeId') rawPlaceId: unknown): Promise<GeocodeResponse> {
    const placeId = validatePlaceId(rawPlaceId);
    const result = await this.mapsService.geocode(placeId);

    return {
      source: result.source,
      placeId,
      label: result.label,
      ...(result.address ? { address: result.address } : {}),
      lat: result.point.latitude,
      lng: result.point.longitude,
    };
  }

  @Post('orders/estimate')
  @HttpCode(HttpStatus.OK)
  estimate(@Body() body: unknown): Promise<OrderEstimateResponse> {
    const request = validateEstimateRequest(body);

    return this.mapsService.estimate(toRouteInput(request));
  }
}

function mapPlaceCandidate(candidate: PlaceCandidate): SearchResponse['results'][number] {
  return {
    placeId: candidate.placeId,
    label: candidate.label,
    ...(candidate.address ? { address: candidate.address } : {}),
    lat: candidate.point.latitude,
    lng: candidate.point.longitude,
  };
}

function toRouteInput(request: EstimateRequestDto): RouteInput {
  return {
    pickup: toGeoPoint(request.pickup),
    stops: request.stops.map(toGeoPoint),
    dropoff: toGeoPoint(request.dropoff),
    vehicleType: request.vehicleType,
  };
}

function toGeoPoint(stop: EstimateStop): GeoPoint {
  return {
    latitude: stop.lat,
    longitude: stop.lng,
  };
}

function validateSearchQuery(rawQuery: unknown): string {
  if (typeof rawQuery !== 'string') {
    validationError([{ field: 'q', messages: ['query parameter is required'] }]);
  }

  const query = rawQuery.trim();

  if (query.length === 0) {
    validationError([{ field: 'q', messages: ['must not be empty'] }]);
  }

  return query;
}

function validatePlaceId(rawPlaceId: unknown): string {
  if (typeof rawPlaceId !== 'string') {
    validationError([{ field: 'placeId', messages: ['path parameter is required'] }]);
  }

  const placeId = rawPlaceId.trim();

  if (placeId.length === 0) {
    validationError([{ field: 'placeId', messages: ['must not be empty'] }]);
  }

  return placeId;
}

function validateEstimateRequest(rawBody: unknown): EstimateRequestDto {
  const issues: ValidationIssue[] = [];
  const body = recordOrNull(rawBody);

  if (body === null) {
    validationError([{ field: 'body', messages: ['must be an object'] }]);
  }

  const pickup = validateEstimateStop(body.pickup, 'pickup', issues);
  const stops = validateStops(body.stops, issues);
  const dropoff = validateEstimateStop(body.dropoff, 'dropoff', issues);
  const vehicleType = validateVehicleType(body.vehicleType, issues);

  if (issues.length > 0 || pickup === null || dropoff === null || vehicleType === null) {
    validationError(issues);
  }

  return {
    pickup,
    stops,
    dropoff,
    vehicleType,
  };
}

function validateStops(rawStops: unknown, issues: ValidationIssue[]): EstimateStop[] {
  if (rawStops === undefined) {
    return [];
  }

  if (!Array.isArray(rawStops)) {
    issues.push({ field: 'stops', messages: ['must be an array when provided'] });
    return [];
  }

  if (rawStops.length > 3) {
    issues.push({ field: 'stops', messages: ['must contain at most 3 items'] });
  }

  return rawStops.flatMap((stop, index) => {
    const parsed = validateEstimateStop(stop, `stops[${index}]`, issues);
    return parsed === null ? [] : [parsed];
  });
}

function validateEstimateStop(
  rawStop: unknown,
  field: string,
  issues: ValidationIssue[],
): EstimateStop | null {
  const stop = recordOrNull(rawStop);

  if (stop === null) {
    issues.push({ field, messages: ['must be an object'] });
    return null;
  }

  const type = validateStopType(stop.type, `${field}.type`, issues);
  const address = validateRequiredString(stop.address, `${field}.address`, issues);
  const lat = validateCoordinate(stop.lat, `${field}.lat`, -90, 90, issues);
  const lng = validateCoordinate(stop.lng, `${field}.lng`, -180, 180, issues);

  if (type === null || address === null || lat === null || lng === null) {
    return null;
  }

  return { type, address, lat, lng };
}

function validateVehicleType(
  rawVehicleType: unknown,
  issues: ValidationIssue[],
): VehicleType | null {
  if (
    rawVehicleType === 'MOTORBIKE' ||
    rawVehicleType === 'VAN' ||
    rawVehicleType === 'TRUCK'
  ) {
    return rawVehicleType;
  }

  issues.push({
    field: 'vehicleType',
    messages: ['must be one of MOTORBIKE, VAN, TRUCK'],
  });
  return null;
}

function validateStopType(
  rawStopType: unknown,
  field: string,
  issues: ValidationIssue[],
): StopType | null {
  if (
    rawStopType === 'PICKUP' ||
    rawStopType === 'STOP' ||
    rawStopType === 'DROPOFF'
  ) {
    return rawStopType;
  }

  issues.push({
    field,
    messages: ['must be one of PICKUP, STOP, DROPOFF'],
  });
  return null;
}

function validateRequiredString(
  rawValue: unknown,
  field: string,
  issues: ValidationIssue[],
): string | null {
  if (typeof rawValue !== 'string') {
    issues.push({ field, messages: ['must be a string'] });
    return null;
  }

  const value = rawValue.trim();

  if (value.length === 0) {
    issues.push({ field, messages: ['must not be empty'] });
    return null;
  }

  return value;
}

function validateCoordinate(
  rawValue: unknown,
  field: string,
  min: number,
  max: number,
  issues: ValidationIssue[],
): number | null {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    issues.push({ field, messages: ['must be a finite number'] });
    return null;
  }

  if (rawValue < min || rawValue > max) {
    issues.push({ field, messages: [`must be between ${min} and ${max}`] });
    return null;
  }

  return rawValue;
}

function validationError(issues: ValidationIssue[]): never {
  throw new DomainError('BAD_REQUEST', 400, 'Validation failed', issues);
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
