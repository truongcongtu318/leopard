import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockSetItemAsync = jest.fn<() => Promise<void>>();
const mockGetItemAsync = jest.fn<() => Promise<string | null>>();
const mockDeleteItemAsync = jest.fn<() => Promise<void>>();
const mockIsAvailableAsync = jest.fn<() => Promise<boolean>>();

jest.mock('../auth/secure-session-storage', () => ({
  secureSessionStorage: {
    setRefreshToken: (value: string) => mockSetItemAsync('leopard.refresh', value),
    getRefreshToken: () => mockGetItemAsync('leopard.refresh'),
    removeRefreshToken: () => mockDeleteItemAsync('leopard.refresh'),
    setRole: (value: string) => mockSetItemAsync('leopard.role', value),
    getRole: () => mockGetItemAsync('leopard.role'),
    removeRole: () => mockDeleteItemAsync('leopard.role'),
  },
}));

import { sessionStore } from '../auth/session-store';
import { getMobileHome, getMobileRouteDecision, useProtectedLayout } from './role-router';

type FetchMock = jest.Mock<(...args: unknown[]) => Promise<Response>>;

function fetchMock(): FetchMock {
  return globalThis.fetch as FetchMock;
}

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
    clone: () => createMockResponse(status, body) as unknown as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response;
}

describe('getMobileHome', () => {
  const cases = [
    ['CUSTOMER', '/(customer)/orders'],
    ['DRIVER', '/(driver)/orders'],
    ['FLEET_OWNER', '/(public)/login'],
    ['ADMIN', '/(public)/login'],
  ] as const;

  for (const [role, expectedHome] of cases) {
    it(`maps ${role} to ${expectedHome}`, () => {
      expect(getMobileHome(role)).toBe(expectedHome);
    });
  }
});

describe('getMobileRouteDecision', () => {
  it.each(['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'] as const)(
    'never permits protected content for %s before hydration',
    (role) => {
      expect(
        getMobileRouteDecision({
          isHydrated: false,
          role,
          routeGroup: role === 'DRIVER' ? 'driver' : 'customer',
        }),
      ).toEqual({
        canRenderProtectedContent: false,
        kind: 'loading',
      });
    },
  );

  it('denies an unauthenticated hydrated session', () => {
    expect(
      getMobileRouteDecision({
        isHydrated: true,
        role: null,
        routeGroup: 'customer',
      }),
    ).toEqual({
      canRenderProtectedContent: false,
      kind: 'denied',
      reason: 'unauthenticated',
      redirectTo: '/(public)/login',
    });
  });

  it.each(['FLEET_OWNER', 'ADMIN'] as const)(
    'denies unsupported mobile role %s explicitly',
    (role) => {
      expect(
        getMobileRouteDecision({
          isHydrated: true,
          role,
          routeGroup: 'customer',
        }),
      ).toEqual({
        canRenderProtectedContent: false,
        kind: 'denied',
        reason: 'unsupported-mobile-role',
        redirectTo: '/(public)/login',
      });
    },
  );

  const authorizedCases = [
    ['CUSTOMER', 'customer'],
    ['DRIVER', 'driver'],
  ] as const;

  for (const [role, routeGroup] of authorizedCases) {
    it(`allows hydrated ${role} content in the matching ${routeGroup} group`, () => {
      expect(
        getMobileRouteDecision({
          isHydrated: true,
          role,
          routeGroup,
        }),
      ).toEqual({
        canRenderProtectedContent: true,
        kind: 'authorized',
      });
    });
  }

  const mismatchedCases = [
    ['CUSTOMER', 'driver', '/(customer)/orders'],
    ['DRIVER', 'customer', '/(driver)/orders'],
  ] as const;

  for (const [role, routeGroup, home] of mismatchedCases) {
    it(`denies hydrated ${role} content in the mismatched ${routeGroup} group`, () => {
      expect(
        getMobileRouteDecision({
          isHydrated: true,
          role,
          routeGroup,
        }),
      ).toEqual({
        canRenderProtectedContent: false,
        kind: 'denied',
        reason: 'role-mismatch',
        redirectTo: home,
      });
    });
  }
});

describe('useProtectedLayout', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn() as unknown as typeof globalThis.fetch;
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
    await sessionStore.clearSession();
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = false;
    jest.restoreAllMocks();
  });

  it('returns loading decision when isHydrated is false', () => {
    // This validates the pure function underlying the hook - pre-hydration always loading
    const decision = getMobileRouteDecision({
      isHydrated: false,
      role: null,
      routeGroup: 'customer',
    });

    expect(decision.kind).toBe('loading');
    expect(decision.canRenderProtectedContent).toBe(false);
  });

  it('resolves isLoading to false after session check completes', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const { result } = await renderHook(() =>
      useProtectedLayout('customer'),
    );

    await waitFor(() => {
      expect(result.current.kind).not.toBe('loading');
    });

    // After hydration with no stored session, should be denied (unauthenticated)
    expect(result.current.canRenderProtectedContent).toBe(false);
    expect(result.current.kind).toBe('denied');
  });

  it('refreshes a persisted session before authorizing protected content after restart', async () => {
    mockGetItemAsync
      .mockResolvedValueOnce('stored-refresh')
      .mockResolvedValueOnce('CUSTOMER');
    fetchMock().mockResolvedValueOnce(createMockResponse(200, {
      accessToken: 'fresh-access',
      accessTokenExpiresAt: '2026-08-06T02:15:00.000Z',
      refreshToken: 'rotated-refresh',
      refreshTokenExpiresAt: '2026-08-13T02:15:00.000Z',
    }));

    const { result } = await renderHook(() =>
      useProtectedLayout('customer'),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        canRenderProtectedContent: true,
        kind: 'authorized',
      });
    });

    const refreshCall = fetchMock().mock.calls[0] as [string, RequestInit | undefined];
    expect(refreshCall[0]).toContain('/auth/refresh');
    expect(refreshCall[1]?.body).toBe(JSON.stringify({ refreshToken: 'stored-refresh' }));
    expect(mockSetItemAsync).toHaveBeenCalledWith('leopard.refresh', 'rotated-refresh');
  });

  it('denies a persisted role that does not match the protected route group', async () => {
    mockGetItemAsync
      .mockResolvedValueOnce('stored-refresh')
      .mockResolvedValueOnce('CUSTOMER');
    fetchMock().mockResolvedValueOnce(createMockResponse(200, {
      accessToken: 'fresh-access',
      accessTokenExpiresAt: '2026-08-06T02:15:00.000Z',
      refreshToken: 'rotated-refresh',
      refreshTokenExpiresAt: '2026-08-13T02:15:00.000Z',
    }));

    const { result } = await renderHook(() =>
      useProtectedLayout('driver'),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        canRenderProtectedContent: false,
        kind: 'denied',
        reason: 'role-mismatch',
        redirectTo: '/(customer)/orders',
      });
    });
  });

  it('clears the persisted session and denies content when hydrate refresh fails', async () => {
    mockGetItemAsync
      .mockResolvedValueOnce('stored-refresh')
      .mockResolvedValueOnce('DRIVER');
    fetchMock().mockResolvedValueOnce(createMockResponse(401, {
      code: 'UNAUTHORIZED',
      message: 'Refresh token expired',
    }));

    const { result } = await renderHook(() =>
      useProtectedLayout('driver'),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        canRenderProtectedContent: false,
        kind: 'denied',
        reason: 'unauthenticated',
        redirectTo: '/(public)/login',
      });
    });

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('leopard.refresh');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('leopard.role');
  });

  it('resolves isLoading to false even when session check throws', async () => {
    mockGetItemAsync.mockRejectedValue(new Error('SecureStore crash'));

    const { result } = await renderHook(() =>
      useProtectedLayout('customer'),
    );

    await waitFor(() => {
      expect(result.current.kind).not.toBe('loading');
    });

    // After hydration failure, should still resolve (not stay loading forever)
    expect(result.current.canRenderProtectedContent).toBe(false);
  });
});
