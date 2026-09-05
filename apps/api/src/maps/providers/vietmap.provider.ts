import type {
  GeocodeResult,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
  CongestionLevel,
} from './map-provider.js';
import { MapProviderNotFoundError } from './map-provider.js';

const DEFAULT_BASE_URL = 'https://maps.vietmap.vn';
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 2;

type FetchFn = typeof fetch;
type VietmapOperation = 'search' | 'geocode' | 'route';

export interface VietmapProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: FetchFn;
  now?: () => Date;
  timeoutMs?: number;
}

interface VietmapPlaceSearchResult {
  ref_id?: unknown;
  display?: unknown;
  name?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
}

interface VietmapPlaceDetail {
  display?: unknown;
  name?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
}

interface VietmapRoutePath {
  distance?: unknown;
  time?: unknown;
  points?: unknown;
  annotations?: unknown;
}

interface VietmapRouteResponse {
  code?: unknown;
  messages?: unknown;
  paths?: unknown;
}

export class VietmapProvider implements MapProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;
  private readonly now: () => Date;
  private readonly timeoutMs: number;

  constructor(private readonly options: VietmapProviderOptions) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async search(query: string): Promise<PlaceCandidate[]> {
    const url = this.buildUrl('/api/autocomplete/v4', {
      text: query,
      display_type: '5',
    });
    const payload = await this.getJson<unknown>(url, 'search');

    if (!Array.isArray(payload)) {
      throw new VietmapProviderError('Vietmap search failed: unexpected response');
    }

    const items = payload
      .map((item) => parseCandidateMeta(item))
      .filter((candidate): candidate is ParsedCandidateMeta => candidate !== null)
      .slice(0, 5);

    const candidates = await Promise.all(
      items.map(async (item): Promise<PlaceCandidate | null> => {
        if (item.lat !== null && item.lng !== null) {
          return {
            placeId: item.placeId,
            label: item.label,
            ...(item.address ? { address: item.address } : {}),
            point: { latitude: item.lat, longitude: item.lng },
            source: 'VIETMAP',
          };
        }

        try {
          const geocoded = await this.geocode(item.placeId);
          return {
            placeId: item.placeId,
            label: geocoded.label || item.label,
            ...(geocoded.address || item.address ? { address: geocoded.address ?? item.address } : {}),
            point: geocoded.point,
            source: 'VIETMAP',
          };
        } catch {
          return null;
        }
      }),
    );

    return candidates.filter((candidate): candidate is PlaceCandidate => candidate !== null);
  }

  async geocode(placeId: string): Promise<GeocodeResult> {
    const url = this.buildUrl('/api/place/v4', {
      refid: placeId,
    });
    const payload = await this.getJson<VietmapPlaceDetail>(url, 'geocode');
    const latitude = numberOrNull(payload.lat);
    const longitude = numberOrNull(payload.lng);
    const address = stringOrNull(payload.address);
    const label =
      stringOrNull(payload.display) ??
      stringOrNull(payload.name) ??
      address ??
      placeId;

    if (latitude === null || longitude === null) {
      throw new VietmapProviderError('Vietmap geocode failed: missing coordinates');
    }

    return {
      label,
      ...(address ? { address } : {}),
      point: { latitude, longitude },
      source: 'VIETMAP',
    };
  }

  async route(input: RouteInput): Promise<RouteEstimate[]> {
    const url = this.buildRouteUrl(input);
    const payload = await this.getJson<VietmapRouteResponse>(url, 'route');
    const paths = allRoutePaths(payload, this.options.apiKey);
    const calculatedAt = this.now();

    const estimates = paths.flatMap((path) => {
      const distance = numberOrNull(path.distance);
      const durationMs = numberOrNull(path.time);

      if (distance === null || durationMs === null || typeof path.points !== 'string') {
        return [];
      }

      const durationS = Math.round(durationMs / 1_000);
      const estimatedArrivalAt = new Date(calculatedAt.getTime() + durationS * 1_000);

      return [
        {
          polyline: path.points,
          distanceM: Math.round(distance),
          durationS,
          estimatedArrivalAt: estimatedArrivalAt.toISOString(),
          estimatedPriceVnd: 0,
          source: 'VIETMAP' as const,
          calculatedAt: calculatedAt.toISOString(),
          isEstimate: true,
          congestionLevel: deriveCongestionLevel(path),
        },
      ];
    });

    if (estimates.length === 0) {
      throw new VietmapProviderError('Vietmap route failed: no valid route path in response');
    }

    return estimates;
  }

  private buildRouteUrl(input: RouteInput): URL {
    const points = [input.pickup, ...input.stops, input.dropoff];
    const params: Record<string, string> = {
      points_encoded: 'true',
      vehicle: mapVehicleType(input.vehicleType),
      alternative: 'true',
      annotations: 'congestion',
    };

    if (input.vehicleType === 'TRUCK') {
      if (input.cargoWeightKg === undefined) {
        throw new VietmapProviderError('Vietmap route failed: cargoWeightKg is required for truck routing');
      }

      params.capacity = String(input.cargoWeightKg);
    }

    const url = this.buildUrl('/api/route/v4', params);

    for (const point of points) {
      url.searchParams.append('point', `${point.latitude},${point.longitude}`);
    }

    return url;
  }

  private buildUrl(pathname: string, params: Record<string, string>): URL {
    const url = new URL(pathname, this.baseUrl);
    url.searchParams.set('apikey', this.options.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url;
  }

  private async getJson<T>(url: URL, operation: VietmapOperation): Promise<T> {
    let latestError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url);

        if (response.ok) {
          return (await response.json()) as T;
        }

        const message = await responseMessage(response);
        const error =
          operation === 'geocode' && response.status === 404
            ? new MapProviderNotFoundError('Vietmap geocode place not found')
            : new VietmapProviderError(
                redactSecrets(
                  `Vietmap ${operation} failed with HTTP ${response.status} ${response.statusText}: ${message}`,
                  this.options.apiKey,
                ),
              );

        if (!isTransientStatus(response.status) || attempt === MAX_ATTEMPTS) {
          throw error;
        }

        latestError = error;
      } catch (error) {
        if (
          error instanceof MapProviderNotFoundError ||
          error instanceof VietmapProviderError
        ) {
          throw error;
        }

        const providerError = toProviderError(error, operation, this.options.apiKey);

        if (isAbortError(error) || attempt === MAX_ATTEMPTS) {
          throw providerError;
        }

        latestError = providerError;
      }
    }

    throw toProviderError(latestError, operation, this.options.apiKey);
  }

  private async fetchWithTimeout(url: URL): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchFn(url.toString(), { method: 'GET', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class VietmapProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VietmapProviderError';
  }
}

interface ParsedCandidateMeta {
  placeId: string;
  label: string;
  address?: string;
  lat: number | null;
  lng: number | null;
}

function parseCandidateMeta(item: unknown): ParsedCandidateMeta | null {
  if (!isRecord(item)) {
    return null;
  }

  const result = item as VietmapPlaceSearchResult;
  const placeId = stringOrNull(result.ref_id);
  const label = stringOrNull(result.display) ?? stringOrNull(result.name) ?? stringOrNull(result.address);

  if (placeId === null || label === null) {
    return null;
  }

  const lat = numberOrNull(result.lat);
  const lng = numberOrNull(result.lng);
  const address = stringOrNull(result.address);

  return {
    placeId,
    label,
    ...(address ? { address } : {}),
    lat,
    lng,
  };
}

function allRoutePaths(payload: VietmapRouteResponse, apiKey: string): VietmapRoutePath[] {
  if (payload.code !== 'OK' || !Array.isArray(payload.paths) || payload.paths.length === 0) {
    throw new VietmapProviderError(
      redactSecrets(
        `Vietmap route failed: ${stringOrNull(payload.messages) ?? 'no route found'}`,
        apiKey,
      ),
    );
  }

  return payload.paths.filter((path): path is VietmapRoutePath => isRecord(path));
}

const CONGESTION_SEVERITY: readonly CongestionLevel[] = ['low', 'moderate', 'heavy', 'severe'];

function deriveCongestionLevel(path: VietmapRoutePath): CongestionLevel {
  const annotations = path.annotations;

  if (!isRecord(annotations) || !Array.isArray(annotations.congestion)) {
    return 'unknown';
  }

  let worst: CongestionLevel = 'unknown';
  let worstRank = -1;

  for (const entry of annotations.congestion) {
    // Vietmap returns segment objects ({ value, first, last }), not bare level strings.
    const level = isRecord(entry) ? entry.value : entry;
    const rank = CONGESTION_SEVERITY.indexOf(level as CongestionLevel);

    if (rank > worstRank) {
      worstRank = rank;
      worst = level as CongestionLevel;
    }
  }

  return worst;
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown;

    if (isRecord(payload)) {
      return (
        stringOrNull(payload.message) ??
        stringOrNull(payload.messages) ??
        JSON.stringify(payload)
      );
    }

    return String(payload);
  } catch {
    return response.statusText;
  }
}

function mapVehicleType(vehicleType: string): string {
  switch (vehicleType) {
    case 'MOTORBIKE':
      return 'motorcycle';
    case 'TRUCK':
      return 'truck';
    default:
      return 'car';
  }
}

function isTransientStatus(status: number): boolean {
  return status >= 500;
}

function toProviderError(error: unknown, operation: VietmapOperation, apiKey: string): VietmapProviderError {
  if (error instanceof VietmapProviderError) {
    return new VietmapProviderError(redactSecrets(error.message, apiKey));
  }

  if (isAbortError(error)) {
    return new VietmapProviderError(`Vietmap ${operation} timed out after ${DEFAULT_TIMEOUT_MS}ms`);
  }

  const message = error instanceof Error ? error.message : String(error);
  return new VietmapProviderError(
    redactSecrets(`Vietmap ${operation} failed: ${message}`, apiKey),
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function redactSecrets(message: string, apiKey: string): string {
  return message.split(apiKey).join('[REDACTED]');
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
