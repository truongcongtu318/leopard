import type { Role } from '@leopard/shared';

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
