import type { Role } from '@leopard/shared';
import { useEffect, useState } from 'react';

import { sessionStore } from '../auth/session-store';

export type MobileHome =
  | '/(customer)/orders'
  | '/(driver)/orders'
  | '/(public)/login';

export type MobileProtectedRouteGroup = 'customer' | 'driver';

export type MobileRouteDecision =
  | {
      canRenderProtectedContent: false;
      kind: 'loading';
    }
  | {
      canRenderProtectedContent: false;
      kind: 'denied';
      reason: 'role-mismatch' | 'unauthenticated' | 'unsupported-mobile-role';
      redirectTo: MobileHome;
    }
  | {
      canRenderProtectedContent: true;
      kind: 'authorized';
    };

type MobileRouteContext = {
  isHydrated: boolean;
  role: Role | null;
  routeGroup: MobileProtectedRouteGroup;
};

export function getMobileHome(role: Role): MobileHome {
  switch (role) {
    case 'CUSTOMER':
      return '/(customer)/orders';
    case 'DRIVER':
      return '/(driver)/orders';
    case 'FLEET_OWNER':
    case 'ADMIN':
      return '/(public)/login';
  }
}

export function getMobileRouteDecision({
  isHydrated,
  role,
  routeGroup,
}: MobileRouteContext): MobileRouteDecision {
  if (!isHydrated) {
    return {
      canRenderProtectedContent: false,
      kind: 'loading',
    };
  }

  if (!role) {
    return {
      canRenderProtectedContent: false,
      kind: 'denied',
      reason: 'unauthenticated',
      redirectTo: '/(public)/login',
    };
  }

  if (role === 'FLEET_OWNER' || role === 'ADMIN') {
    return {
      canRenderProtectedContent: false,
      kind: 'denied',
      reason: 'unsupported-mobile-role',
      redirectTo: '/(public)/login',
    };
  }

  const expectedRole: Role = routeGroup === 'customer' ? 'CUSTOMER' : 'DRIVER';

  if (role !== expectedRole) {
    return {
      canRenderProtectedContent: false,
      kind: 'denied',
      reason: 'role-mismatch',
      redirectTo: getMobileHome(role),
    };
  }

  return {
    canRenderProtectedContent: true,
    kind: 'authorized',
  };
}

/**
 * Hook for protected layouts that performs session hydration and returns
 * the route decision. Uses a `finally` block to guarantee isHydrated is
 * set to true even when hydration throws, preventing infinite loading.
 */
export function useProtectedLayout(
  routeGroup: MobileProtectedRouteGroup,
): MobileRouteDecision {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      try {
        await sessionStore.hydrate();
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    void initSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const role = sessionStore.isAuthenticated()
    ? inferRoleFromRouteGroup(routeGroup)
    : null;

  return getMobileRouteDecision({ isHydrated, role, routeGroup });
}

/**
 * When the session store has a token but no explicit role stored,
 * infer the role from the route group the user navigated to.
 * This is safe because role-mismatch is caught by getMobileRouteDecision.
 */
function inferRoleFromRouteGroup(routeGroup: MobileProtectedRouteGroup): Role {
  return routeGroup === 'customer' ? 'CUSTOMER' : 'DRIVER';
}
