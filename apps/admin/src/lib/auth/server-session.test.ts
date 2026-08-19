import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../api/api-error';

jest.mock('server-only', () => ({}), { virtual: true });

import { fetchVerifiedOperationsUser } from './server-session';

type FetchMock = jest.Mock<(input: string, init?: RequestInit) => Promise<Response>>;

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('server operations session', () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.API_URL;
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as typeof globalThis.fetch;
    process.env.API_URL = 'http://api.test/api/v1';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.API_URL = originalApiUrl;
    jest.restoreAllMocks();
  });

  it('verifies the access token through /me without caching', async () => {
    fetchMock.mockResolvedValue(
      response(200, {
        id: 'usr-fleet-1',
        phone: '0900000000',
        role: 'FLEET_OWNER',
        status: 'ACTIVE',
      }),
    );

    await expect(fetchVerifiedOperationsUser('trusted-token')).resolves.toEqual({
      id: 'usr-fleet-1',
      role: 'FLEET_OWNER',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/me',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer trusted-token',
        }),
      }),
    );
  });

  it.each([401, 403])('treats backend %i as an invalid session', async (status) => {
    fetchMock.mockResolvedValue(response(status, { code: 'UNAUTHORIZED' }));

    await expect(fetchVerifiedOperationsUser('expired-token')).resolves.toBeNull();
  });

  it('rejects malformed profile data instead of trusting a client role', async () => {
    fetchMock.mockResolvedValue(
      response(200, {
        id: 'usr-1',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      }),
    );

    await expect(fetchVerifiedOperationsUser('token')).rejects.toMatchObject({
      statusCode: 502,
      code: 'INVALID_UPSTREAM_RESPONSE',
    } satisfies Partial<ApiError>);
  });
});
