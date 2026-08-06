import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockSetItemAsync = jest.fn<() => Promise<void>>();
const mockGetItemAsync = jest.fn<() => Promise<string | null>>();
const mockDeleteItemAsync = jest.fn<() => Promise<void>>();
const mockIsAvailableAsync = jest.fn<() => Promise<boolean>>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: mockSetItemAsync,
  getItemAsync: mockGetItemAsync,
  deleteItemAsync: mockDeleteItemAsync,
  isAvailableAsync: mockIsAvailableAsync,
}), { virtual: true });

import { getMobileHome, getMobileRouteDecision, useProtectedLayout } from './role-router';

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
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
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
