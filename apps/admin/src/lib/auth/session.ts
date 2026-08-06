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
  accessToken?: string;
}

/**
 * Module-level singleton holding the current session.
 * In a real Next.js app this would be backed by cookies() from next/headers
 * or an API route. For now, simple in-memory state.
 */
let _session: Session | null = null;
let _accessToken: string | null = null;

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  return _session;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

/**
 * Set (or replace) the current session.
 */
export async function setSession(session: Session | null): Promise<void> {
  if (session === null) {
    await clearSession();
    return;
  }
  _session = session;
  _accessToken = session.accessToken ?? null;
}

export async function setAccessToken(
  accessToken: string,
  expiresAt: string,
): Promise<void> {
  _accessToken = accessToken;
  if (_session !== null) {
    _session = { ..._session, accessToken, expiresAt };
  }
}

/**
 * Clear the current session.
 */
export async function clearSession(): Promise<void> {
  _session = null;
  _accessToken = null;
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
