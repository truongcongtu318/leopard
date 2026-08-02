import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DemoMapProvider } from './demo-map.provider.js';
import {
  MapProviderNotFoundError,
  type MapProvider,
  type RouteInput,
} from './map-provider.js';
import { ResilientMapProvider } from './resilient-map.provider.js';
import { VietmapProvider } from './vietmap.provider.js';

const API_KEY = 'secret-vietmap-key';
const BASE_URL = 'https://maps.test';
const CALCULATED_AT = new Date('2026-08-01T03:00:00.000Z');

type FetchMock = jest.MockedFunction<typeof fetch>;

describe('VietmapProvider', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = jest.fn<typeof fetch>();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('URL-encodes autocomplete requests and maps places to shared candidates', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, [
        {
          ref_id: 'auto:abc/123',
          display: '197 Tran Phu, Quan 5',
          name: '197 Tran Phu',
          lat: 10.759221,
          lng: 106.675901,
        },
      ]),
    );
    const provider = vietmapProvider(fetchMock);

    await expect(provider.search('197 Trần Phú #5')).resolves.toEqual([
      {
        placeId: 'auto:abc/123',
        label: '197 Tran Phu, Quan 5',
        point: {
          latitude: 10.759221,
          longitude: 106.675901,
        },
        source: 'VIETMAP',
      },
    ]);

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/autocomplete/v4');
    expect(requestedUrl.searchParams.get('apikey')).toBe(API_KEY);
    expect(requestedUrl.searchParams.get('text')).toBe('197 Trần Phú #5');
    expect(requestedUrl.search).toContain('text=197+Tr%E1%BA%A7n+Ph%C3%BA+%235');
    expect(requestedUrl.searchParams.get('display_type')).toBe('5');
  });

  it('maps Place v4 payloads to shared coordinates', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        display: '197 Đường Trần Phú,Phường Chợ Quán,Thành Phố Hồ Chí Minh',
        lat: 10.759222947000069,
        lng: 106.67590269100003,
      }),
    );
    const provider = vietmapProvider(fetchMock);

    await expect(provider.geocode('auto:opaque/ref id')).resolves.toEqual({
      label: '197 Đường Trần Phú,Phường Chợ Quán,Thành Phố Hồ Chí Minh',
      point: {
        latitude: 10.759222947000069,
        longitude: 106.67590269100003,
      },
      source: 'VIETMAP',
    });

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/place/v4');
    expect(requestedUrl.searchParams.get('refid')).toBe('auto:opaque/ref id');
  });

  it('maps a missing geocode response to the shared provider not-found error', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: 'place not found' }, 'Not Found'),
    );
    const provider = vietmapProvider(fetchMock);

    const error = await catchError(provider.geocode('missing-place'));

    expect(error).toBeInstanceOf(MapProviderNotFoundError);
    expect(error.message).toBe('Vietmap geocode place not found');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps Route v4 payloads to shared route estimates without leaking SDK types', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        code: 'OK',
        paths: [
          {
            distance: 2_194.4,
            time: 351_400,
            points: '}s{`Ac_hjSjAkCFQRu@',
            toll_cost: 59_000,
          },
        ],
      }),
    );
    const provider = vietmapProvider(fetchMock);

    await expect(provider.route(routeInput())).resolves.toEqual({
      polyline: '}s{`Ac_hjSjAkCFQRu@',
      distanceM: 2_194,
      durationS: 351,
      estimatedArrivalAt: '2026-08-01T03:05:51.000Z',
      estimatedPriceVnd: 0,
      source: 'VIETMAP',
      calculatedAt: '2026-08-01T03:00:00.000Z',
      isEstimate: true,
    });

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/route/v4');
    expect(requestedUrl.searchParams.getAll('point')).toEqual([
      '10.796284,106.705923',
      '10.799,106.706',
      '10.801891,106.70661',
    ]);
    expect(requestedUrl.searchParams.get('vehicle')).toBe('motorcycle');
    expect(requestedUrl.searchParams.get('points_encoded')).toBe('true');
  });

  it('aborts provider requests after 5 seconds', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_input, init) => abortableFetch(init?.signal));
    const provider = vietmapProvider(fetchMock);

    const pendingSearch = provider.search('slow address');
    const timeoutExpectation = expect(pendingSearch).rejects.toThrow(/timed out/i);
    await jest.advanceTimersByTimeAsync(4_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await timeoutExpectation;
  });

  it('retries one transient GET failure', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { message: 'temporary outage' }))
      .mockResolvedValueOnce(
        jsonResponse(200, [
          {
            ref_id: 'auto:retry-ok',
            display: 'Retry OK',
            lat: 10.75,
            lng: 106.67,
          },
        ]),
      );
    const provider = vietmapProvider(fetchMock);

    await expect(provider.search('retry me')).resolves.toEqual([
      {
        placeId: 'auto:retry-ok',
        label: 'Retry OK',
        point: {
          latitude: 10.75,
          longitude: 106.67,
        },
        source: 'VIETMAP',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry 4xx failures and redacts the API key from errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { message: `invalid ${API_KEY}` }, 'Bad Request'),
    );
    const provider = vietmapProvider(fetchMock);

    const error = await catchError(provider.search('bad request'));
    expect(error.message).toBe(
      'Vietmap search failed with HTTP 400 Bad Request: invalid [REDACTED]',
    );
    expect(error.message).not.toContain(API_KEY);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redacts API keys from network error details', async () => {
    const networkError = new Error(
      `${BASE_URL}/api/place/v4?apikey=${API_KEY}&refid=auto:abc failed`,
    );
    fetchMock.mockRejectedValueOnce(networkError).mockRejectedValueOnce(networkError);
    const provider = vietmapProvider(fetchMock);

    const error = await catchError(provider.geocode('auto:abc'));
    expect(error.message).toContain('[REDACTED]');
    expect(error.message).not.toContain(API_KEY);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('redacts API keys from Route v4 application-level failures', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        code: 'INVALID_REQUEST',
        messages: `invalid route for ${API_KEY}`,
        paths: [],
      }),
    );
    const provider = vietmapProvider(fetchMock);

    const error = await catchError(provider.route(routeInput()));
    expect(error.message).toBe('Vietmap route failed: invalid route for [REDACTED]');
    expect(error.message).not.toContain(API_KEY);
  });
});

describe('ResilientMapProvider', () => {
  const originalAllowDemoProvider = process.env.ALLOW_DEMO_PROVIDER;

  afterEach(() => {
    process.env.ALLOW_DEMO_PROVIDER = originalAllowDemoProvider;
  });

  it('falls back to the demo provider only when ALLOW_DEMO_PROVIDER=true', async () => {
    process.env.ALLOW_DEMO_PROVIDER = 'true';
    const provider = new ResilientMapProvider(
      failingProvider(),
      new DemoMapProvider(),
    );

    await expect(provider.route(routeInput())).resolves.toMatchObject({
      source: 'DEMO',
      isEstimate: true,
    });
  });

  it('does not use demo fallback when ALLOW_DEMO_PROVIDER is not true', async () => {
    process.env.ALLOW_DEMO_PROVIDER = 'false';
    const provider = new ResilientMapProvider(
      failingProvider(),
      new DemoMapProvider(),
    );

    await expect(provider.route(routeInput())).rejects.toThrow('provider unavailable');
  });

  it('does not replace a provider not-found with demo data', async () => {
    process.env.ALLOW_DEMO_PROVIDER = 'true';
    const provider = new ResilientMapProvider(
      notFoundProvider(),
      new DemoMapProvider(),
    );

    await expect(provider.geocode('missing-place')).rejects.toBeInstanceOf(
      MapProviderNotFoundError,
    );
  });
});

function vietmapProvider(fetchFn: FetchMock): VietmapProvider {
  return new VietmapProvider({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    fetchFn,
    now: () => CALCULATED_AT,
  });
}

function routeInput(): RouteInput {
  return {
    pickup: { latitude: 10.796284, longitude: 106.705923 },
    stops: [{ latitude: 10.799, longitude: 106.706 }],
    dropoff: { latitude: 10.801891, longitude: 106.70661 },
    vehicleType: 'MOTORBIKE',
  };
}

function jsonResponse(
  status: number,
  body: unknown,
  statusText = status >= 200 && status < 300 ? 'OK' : 'Error',
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as Response;
}

function getRequestedUrl(fetchFn: FetchMock): URL {
  const [input] = fetchFn.mock.calls[fetchFn.mock.calls.length - 1] ?? [];
  return new URL(String(input));
}

function abortableFetch(signal?: AbortSignal | null): Promise<Response> {
  return new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  });
}

async function catchError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }

  throw new Error('Expected promise to reject');
}

function failingProvider(): MapProvider {
  return {
    search: async () => {
      throw new Error('provider unavailable');
    },
    geocode: async () => {
      throw new Error('provider unavailable');
    },
    route: async () => {
      throw new Error('provider unavailable');
    },
  };
}

function notFoundProvider(): MapProvider {
  return {
    search: async () => [],
    geocode: async () => {
      throw new MapProviderNotFoundError();
    },
    route: async () => {
      throw new MapProviderNotFoundError();
    },
  };
}
