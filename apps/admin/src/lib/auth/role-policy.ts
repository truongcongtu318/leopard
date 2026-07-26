import { ApiError } from "../api/api-error";

/**
 * Mirror of the shared Role type to avoid dependency on @leopard/shared.
 */
export type Role = "CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN";

/**
 * Allowed roles for a given route or resource.
 */
export type AllowedRoles = Role[];

/**
 * Role hierarchy for the admin web app:
 *
 * - ADMIN: can access everything (admin, fleet, driver routes)
 * - FLEET_OWNER: can access fleet, fleet+driver, and driver routes
 * - DRIVER: can access driver routes only
 * - CUSTOMER: gets nothing in admin
 *
 * The hierarchy is: ADMIN > FLEET_OWNER > DRIVER > CUSTOMER
 */

const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 3,
  FLEET_OWNER: 2,
  DRIVER: 1,
  CUSTOMER: 0,
};

/**
 * Check whether the given user role is allowed to access a resource
 * that requires one of the `allowedRoles`.
 *
 * ADMIN    → any route
 * FLEET_OWNER → fleet, driver
 * DRIVER   → driver only
 * CUSTOMER → nothing
 */
export function canAccess(
  userRole: Role,
  allowedRoles: AllowedRoles,
): boolean {
  if (allowedRoles.length === 0) return false;

  // ADMIN can access everything
  if (userRole === "ADMIN") return true;

  const userLevel = ROLE_LEVEL[userRole] as number;

  for (const allowed of allowedRoles) {
    const requiredLevel = ROLE_LEVEL[allowed] as number;
    if (userLevel >= requiredLevel) return true;
  }

  return false;
}

/**
 * Assert that the user has the required role. Throws ApiError(403, FORBIDDEN)
 * if access is denied.
 */
export function requireRole(
  userRole: Role,
  allowedRoles: AllowedRoles,
): void {
  if (!canAccess(userRole, allowedRoles)) {
    throw new ApiError(403, "FORBIDDEN", "Access denied");
  }
}
