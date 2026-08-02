import {
  HttpCode,
  HttpStatus,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseFilters,
  UseGuards,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import { MapsService } from './maps.service.js';
import type { OrderEstimateResponse } from './maps.service.js';
import type { PlaceCandidate } from './providers/map-provider.js';

type VehicleType = 'MOTORBIKE' | 'VAN' | 'TRUCK';

class SearchQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q!: string;
}

class GeocodeParamsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  placeId!: string;
}

class GeoPointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

class EstimateRequestDto {
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickup!: GeoPointDto;

  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  stops!: GeoPointDto[];

  @ValidateNested()
  @Type(() => GeoPointDto)
  dropoff!: GeoPointDto;

  @IsString()
  @IsIn(['MOTORBIKE', 'VAN', 'TRUCK'])
  vehicleType!: VehicleType;
}

interface GeocodeResponse {
  placeId: string;
  point: GeoPointDto;
  source: 'VIETMAP' | 'DEMO';
}

@Injectable()
export class BearerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const authorization = request.headers.authorization;

    if (
      typeof authorization !== 'string' ||
      !authorization.startsWith('Bearer ') ||
      authorization.slice('Bearer '.length).trim().length === 0
    ) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
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
      headers: Record<string, string | string[] | undefined>;
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
    headers: Record<string, string | string[] | undefined>;
  }): string {
    const authorization = request.headers.authorization;
    const token =
      typeof authorization === 'string'
        ? authorization.trim()
        : Array.isArray(authorization)
          ? authorization.join(',').trim()
          : 'unknown';
    const ip = request.ip?.trim() || 'unknown';

    return `${token}:${ip}`;
  }
}

@Controller()
@UseFilters(ApiExceptionFilter)
@UseGuards(BearerAuthGuard, MapsRateLimitGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('maps/search')
  search(@Query() query: SearchQueryDto): Promise<PlaceCandidate[]> {
    return this.mapsService.search(query.q);
  }

  @Get('maps/geocode/:placeId')
  async geocode(@Param() params: GeocodeParamsDto): Promise<GeocodeResponse> {
    const result = await this.mapsService.geocode(params.placeId);

    return {
      placeId: params.placeId,
      ...result,
    };
  }

  @Post('orders/estimate')
  @HttpCode(HttpStatus.OK)
  estimate(@Body() body: EstimateRequestDto): Promise<OrderEstimateResponse> {
    return this.mapsService.estimate({
      pickup: body.pickup,
      stops: body.stops,
      dropoff: body.dropoff,
      vehicleType: body.vehicleType,
    });
  }
}
