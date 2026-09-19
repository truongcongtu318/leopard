import {
  HttpCode,
  HttpStatus,
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
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
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import {
  MapPlaceNotFoundError,
  MapsService,
  type NearbyDriversResponse,
  type OrderEstimateResponse,
} from './maps.service.js';
import type {
  GeocodeResult,
  GeoPoint,
  MapProviderSource,
  PlaceCandidate,
  RouteInput,
} from './providers/map-provider.js';
import { VEHICLE_OPTIONS } from '@leopard/shared';

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
  cargoWeightKg?: number;
  hasLoadingSupport?: boolean;
  hasVatInvoice?: boolean;
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
const isProd = process.env.NODE_ENV === 'production';
const ROUTE_RATE_LIMITS: ReadonlyArray<{
  method: 'GET' | 'POST';
  pathPrefix: string;
  maxRequests: number;
}> = [
  { method: 'GET', pathPrefix: '/maps/search', maxRequests: isProd ? 30 : 200 },
  { method: 'GET', pathPrefix: '/maps/geocode/', maxRequests: isProd ? 30 : 200 },
  { method: 'GET', pathPrefix: '/maps/nearby-drivers', maxRequests: isProd ? 60 : 200 },
  { method: 'POST', pathPrefix: '/orders/estimate', maxRequests: isProd ? 60 : 200 },
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
      throw new DomainError('RATE_LIMITED', 429, 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau');
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
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    return `actor:${actor.userId}:${ip}`;
  }
}

@Controller()
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard, MapsRateLimitGuard)
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

    let result: GeocodeResult;
    try {
      result = await this.mapsService.geocode(placeId);
    } catch (error) {
      if (error instanceof MapPlaceNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }

    return {
      source: result.source,
      placeId,
      label: result.label,
      ...(result.address ? { address: result.address } : {}),
      lat: result.point.latitude,
      lng: result.point.longitude,
    };
  }

  @Get('maps/nearby-drivers')
  async nearbyDrivers(
    @Query() rawQuery: Record<string, unknown>,
  ): Promise<NearbyDriversResponse> {
    const query = validateNearbyDriversQuery(rawQuery);
    return this.mapsService.getNearbyDrivers(query);
  }

  @Post('orders/estimate')
  @RequireRoles('CUSTOMER')
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
    ...(request.cargoWeightKg === undefined ? {} : { cargoWeightKg: request.cargoWeightKg }),
    hasLoadingSupport: request.hasLoadingSupport,
    hasVatInvoice: request.hasVatInvoice,
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

interface NearbyDriversQueryDto {
  lat: number;
  lng: number;
  radiusM?: number;
  vehicleType?: VehicleType;
  limit?: number;
}

function validateNearbyDriversQuery(rawQuery: Record<string, unknown>): NearbyDriversQueryDto {
  const issues: ValidationIssue[] = [];
  const query = recordOrNull(rawQuery) ?? {};

  const rawLat = query.lat !== undefined ? Number(query.lat) : undefined;
  const rawLng = query.lng !== undefined ? Number(query.lng) : undefined;

  const lat = validateCoordinate(rawLat, 'lat', -90, 90, issues);
  const lng = validateCoordinate(rawLng, 'lng', -180, 180, issues);

  let radiusM: number | undefined;
  if (query.radiusM !== undefined) {
    const r = Number(query.radiusM);
    if (!Number.isFinite(r) || r < 100 || r > 50000) {
      issues.push({ field: 'radiusM', messages: ['must be a number between 100 and 50000'] });
    } else {
      radiusM = r;
    }
  }

  let limit: number | undefined;
  if (query.limit !== undefined) {
    const l = Number(query.limit);
    if (!Number.isSafeInteger(l) || l < 1 || l > 50) {
      issues.push({ field: 'limit', messages: ['must be an integer between 1 and 50'] });
    } else {
      limit = l;
    }
  }

  let vehicleType: VehicleType | undefined;
  if (query.vehicleType !== undefined) {
    const vt = validateVehicleType(query.vehicleType, issues);
    if (vt !== null) {
      vehicleType = vt;
    }
  }

  if (issues.length > 0 || lat === null || lng === null) {
    validationError(issues);
  }

  return {
    lat,
    lng,
    ...(radiusM !== undefined ? { radiusM } : {}),
    ...(vehicleType !== undefined ? { vehicleType } : {}),
    ...(limit !== undefined ? { limit } : {}),
  };
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
  const cargoWeightKg = validateCargoWeightKg(body.cargoWeightKg, vehicleType, issues);
  const hasLoadingSupport = validateOptionalBoolean(body.hasLoadingSupport, 'hasLoadingSupport', issues);
  const hasVatInvoice = validateOptionalBoolean(body.hasVatInvoice, 'hasVatInvoice', issues);

  if (issues.length > 0 || pickup === null || dropoff === null || vehicleType === null) {
    validationError(issues);
  }

  return {
    pickup,
    stops,
    dropoff,
    vehicleType,
    ...(cargoWeightKg === undefined ? {} : { cargoWeightKg }),
    ...(hasLoadingSupport === undefined ? {} : { hasLoadingSupport }),
    ...(hasVatInvoice === undefined ? {} : { hasVatInvoice }),
  };
}

function validateOptionalBoolean(
  rawValue: unknown,
  field: string,
  issues: ValidationIssue[],
): boolean | undefined {
  if (rawValue === undefined) {
    return undefined;
  }

  if (typeof rawValue !== 'boolean') {
    issues.push({ field, messages: ['must be a boolean'] });
    return undefined;
  }

  return rawValue;
}

function validateCargoWeightKg(
  rawValue: unknown,
  vehicleType: VehicleType | null,
  issues: ValidationIssue[],
): number | undefined {
  if (vehicleType !== 'TRUCK') {
    return undefined;
  }

  if (typeof rawValue !== 'number' || !Number.isSafeInteger(rawValue) || rawValue <= 0) {
    issues.push({
      field: 'cargoWeightKg',
      messages: ['is required and must be a positive integer when vehicleType is TRUCK'],
    });
    return undefined;
  }

  const maxWeightKg = VEHICLE_OPTIONS.find((option) => option.type === 'TRUCK')?.maxWeightKg ?? 0;

  if (rawValue > maxWeightKg) {
    issues.push({ field: 'cargoWeightKg', messages: [`must not exceed ${maxWeightKg}`] });
    return undefined;
  }

  return rawValue;
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
  throw new DomainError('BAD_REQUEST', 400, 'Dữ liệu không hợp lệ', issues);
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
