import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock expo-secure-store BEFORE any code that might transitively import it.
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
}), { virtual: true });

jest.mock('../auth/session-store', () => {
  const getAccessToken = jest.fn();
  const getRefreshCredential = jest.fn();
  const setSession = jest.fn();
  const clearSession = jest.fn();

  (globalThis as Record<string, unknown>).__sessionMocks = {
    getAccessToken,
    getRefreshCredential,
    setSession,
    clearSession,
  };

  return {
    sessionStore: { getAccessToken, getRefreshCredential, setSession, clearSession },
  };
});

import { httpClient } from './http-client';

interface SessionMockFns {
  getAccessToken: jest.Mock<() => string | null>;
  getRefreshCredential: jest.Mock<() => Promise<string | null>>;
  setSession: jest.Mock<(accessToken: string, refreshCredential: string) => Promise<void>>;
  clearSession: jest.Mock<() => Promise<void>>;
}

function mocks(): SessionMockFns {
  return (globalThis as Record<string, unknown>).__sessionMocks as SessionMockFns;
}

type FetchMock = jest.Mock<(...args: unknown[]) => Promise<Response>>;

function fetchMock(): FetchMock {
  return globalThis.fetch as FetchMock;
}

function lastFetchArgs(): [string, RequestInit | undefined] {
  return fetchMock().mock.calls[fetchMock().mock.calls.length - 1] as [string, RequestInit | undefined];
}

describe('http-client', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn() as unknown as typeof globalThis.fetch;
    jest.clearAllMocks();
    mocks().getAccessToken.mockReturnValue(null);
    mocks().getRefreshCredential.mockResolvedValue(null);
    mocks().setSession.mockResolvedValue(undefined);
    mocks().clearSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // ---- Bearer header ----

  it('attaches Authorization header when access token is available', async () => {
    mocks().getAccessToken.mockReturnValue('test-token');
    fetchMock().mockResolvedValue(createMockResponse(200, { data: 'ok' }));

    await httpClient.get('/test');

    const [url, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe('Bearer test-token');
    expect(url).toContain('/test');
  });

  it('does not attach Authorization header when no access token', async () => {
    mocks().getAccessToken.mockReturnValue(null);
    fetchMock().mockResolvedValue(createMockResponse(200, { data: 'ok' }));

    await httpClient.get('/test');

    const [, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  // ---- x-request-id header ----

  it('attaches x-request-id header on every request', async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: 'ok' }));

    await httpClient.get('/test');

    const [, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['x-request-id']).toBeDefined();
    expect(headers?.['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('generates unique request-id for each request', async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: 'ok' }));

    await httpClient.get('/a');
    await httpClient.get('/b');

    const calls = fetchMock().mock.calls;
    const id1 = ((calls[0][1] as RequestInit | undefined)?.headers as Record<string, string>)['x-request-id'];
    const id2 = ((calls[1][1] as RequestInit | undefined)?.headers as Record<string, string>)['x-request-id'];
    expect(id1).not.toBe(id2);
  });

  // ---- Content-Type ----

  it('sets Content-Type: application/json by default', async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: 'ok' }));

    await httpClient.get('/test');

    const [, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['Content-Type']).toBe('application/json');
  });

  // ---- HTTP methods ----

  it('performs GET request', async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { id: 1 }));

    const result = await httpClient.get<{ id: number }>('/items/1');

    const [url, init] = lastFetchArgs();
    expect(init?.method).toBe('GET');
    expect(url).toContain('/items/1');
    expect(result.id).toBe(1);
  });

  it('performs POST request with body', async () => {
    fetchMock().mockResolvedValue(createMockResponse(201, { id: 2 }));

    const body = { name: 'test' };
    await httpClient.post<{ id: number }>('/items', body);

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it('performs PUT request with body', async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { id: 3 }));

    const body = { name: 'updated' };
    await httpClient.put<{ id: number }>('/items/3', body);

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe('PUT');
  });

  it('performs DELETE request', async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, {}));

    await httpClient.delete('/items/4');

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe('DELETE');
  });

  // ---- 401 / token refresh flow ----

  it('attempts token refresh on 401 and retries original request', async () => {
    mocks().getAccessToken.mockReturnValue('expired-token');
    mocks().getRefreshCredential.mockResolvedValue('refresh-cred-1');

    fetchMock()
      .mockResolvedValueOnce(createMockResponse(401, { code: 'UNAUTHORIZED', message: 'Token expired' }))
      .mockResolvedValueOnce(createMockResponse(200, { accessToken: 'new-access-token', refreshCredential: 'new-refresh-cred' }))
      .mockResolvedValueOnce(createMockResponse(200, { data: 'success' }));

    const result = await httpClient.get('/protected');

    expect(result).toEqual({ data: 'success' });
    expect(fetchMock()).toHaveBeenCalledTimes(3);
    expect(mocks().setSession).toHaveBeenCalledWith('new-access-token', 'new-refresh-cred');
  });

  it('throws error with ApiError shape when refresh fails', async () => {
    mocks().getAccessToken.mockReturnValue('expired-token');
    mocks().getRefreshCredential.mockResolvedValue('bad-refresh');

    fetchMock()
      .mockResolvedValueOnce(createMockResponse(401, { code: 'UNAUTHORIZED', message: 'Token expired' }))
      .mockResolvedValueOnce(createMockResponse(401, { code: 'REFRESH_FAILED', message: 'Invalid refresh token' }));

    await expect(httpClient.get('/protected')).rejects.toMatchObject({
      name: 'ApiError',
    });
    expect(mocks().clearSession).toHaveBeenCalled();
  });

  it('throws error with ApiError shape when no refresh credential available on 401', async () => {
    mocks().getAccessToken.mockReturnValue('expired-token');
    mocks().getRefreshCredential.mockResolvedValue(null);

    fetchMock().mockResolvedValueOnce(createMockResponse(401, { code: 'UNAUTHORIZED', message: 'Token expired' }));

    await expect(httpClient.get('/protected')).rejects.toMatchObject({
      name: 'ApiError',
    });
    expect(mocks().clearSession).toHaveBeenCalled();
  });

  // ---- concurrent refresh deduplication ----

  it('deduplicates concurrent refresh calls (only one refresh when multiple 401s)', async () => {
    mocks().getAccessToken.mockReturnValue('expired-token');
    mocks().getRefreshCredential.mockResolvedValue('refresh-cred-1');

    const r401 = createMockResponse(401, { code: 'UNAUTHORIZED', message: 'Token expired' });
    const rTokens = createMockResponse(200, { accessToken: 'new-token', refreshCredential: 'new-refresh' });
    const rOk = createMockResponse(200, { data: 'ok' });

    fetchMock()
      .mockResolvedValueOnce(r401)   // req1
      .mockResolvedValueOnce(r401)   // req2
      .mockResolvedValueOnce(r401)   // req3
      .mockResolvedValueOnce(rTokens) // single refresh
      .mockResolvedValueOnce(rOk)     // retry req1
      .mockResolvedValueOnce(rOk)     // retry req2
      .mockResolvedValueOnce(rOk);    // retry req3

    const [r1, r2, r3] = await Promise.all([
      httpClient.get('/a'),
      httpClient.get('/b'),
      httpClient.get('/c'),
    ]);

    expect(r1).toEqual({ data: 'ok' });
    expect(r2).toEqual({ data: 'ok' });
    expect(r3).toEqual({ data: 'ok' });
    expect(fetchMock()).toHaveBeenCalledTimes(7);
  });

  // ---- error parsing ----

  it('throws error with parsed body for non-OK responses (non-401)', async () => {
    const errorBody = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      requestId: 'req-abc',
      details: { field: 'name' },
    };
    fetchMock().mockResolvedValue(createMockResponse(422, errorBody));

    let caught: unknown;
    try {
      await httpClient.post('/items', { name: '' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'ApiError',
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      requestId: 'req-abc',
      details: { field: 'name' },
    });
  });

  it('throws generic error for unknown error response', async () => {
    fetchMock().mockResolvedValue(createMockResponse(500, 'plain text error'));

    let caught: unknown;
    try {
      await httpClient.get('/server-error');
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'ApiError',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  });

  // ---- network errors ----

  it('throws error with statusCode 0 on network error', async () => {
    fetchMock().mockRejectedValue(new TypeError('Network request failed'));

    let caught: unknown;
    try {
      await httpClient.get('/offline');
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'ApiError',
      statusCode: 0,
      code: 'NETWORK_ERROR',
    });
  });

  // ---- base URL ----

  it('uses path in the request URL', async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: 'ok' }));

    await httpClient.get('/path');

    const [url] = lastFetchArgs();
    expect(url).toMatch(/\/path$/);
  });
});

// Helpers

function createMockResponse(status: number, body: unknown): Response {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
    text: () => Promise.resolve(bodyStr),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => createMockResponse(status, body),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response;
}
