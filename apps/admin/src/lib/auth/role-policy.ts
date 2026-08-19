import { ApiError } from '../api/api-error';

/**
 * Mirror of the shared Role type to avoid dependency on @leopard/shared.
 */
export type Role = 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';

/**
 * Allowed roles for a given route or resource.
 */
export type AllowedRoles = readonly Role[];

/**
 * Operations routes use an explicit allow-list. Roles are separate security
 * boundaries: ADMIN does not inherit FLEET_OWNER routes and FLEET_OWNER does
 * not inherit DRIVER routes.
 */

/**
 * Check whether the given user role is allowed to access a resource
 * that requires one of the `allowedRoles`.
 *
 * A role is allowed only when it is listed explicitly. Backend authorization
 * still owns account status, membership, ownership and resource scope.
 */
export function canAccess(userRole: Role, allowedRoles: AllowedRoles): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Assert that the user has the required role. Throws ApiError(403, FORBIDDEN)
 * if access is denied.
 */
export function requireRole(userRole: Role, allowedRoles: AllowedRoles): void {
  if (!canAccess(userRole, allowedRoles)) {
    throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  }
}
