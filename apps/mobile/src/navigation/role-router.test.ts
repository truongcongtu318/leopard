import { describe, expect, it } from '@jest/globals';

import { getMobileHome, getMobileRouteDecision } from './role-router';

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
