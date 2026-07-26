/**
 * Mirror of the shared Role type to avoid dependency on @leopard/shared.
 */
export type Role = "CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN";

/**
 * Session type for the admin web app.
 *
 * - userId: unique identifier for the authenticated user
 * - role: Role enum value determining authorization
 * - expiresAt: ISO-8601 timestamp; sessions past this are considered expired
 */
export interface Session {
  userId: string;
  role: Role;
  expiresAt: string;
}

/**
 * Module-level singleton holding the current session.
 * In a real Next.js app this would be backed by cookies() from next/headers
 * or an API route. For now, simple in-memory state.
 */
let _session: Session | null = null;

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  return _session;
}

/**
 * Set (or replace) the current session.
 */
export async function setSession(session: Session): Promise<void> {
  _session = session;
}

/**
 * Clear the current session.
 */
export async function clearSession(): Promise<void> {
  _session = null;
}

/**
 * Check whether the session is non-null and not expired.
 */
export function isAuthenticated(
  session: Session | null,
): boolean {
  if (session === null) return false;
  const now = Date.now();
  const expires = new Date(session.expiresAt).getTime();
  return now < expires;
}
