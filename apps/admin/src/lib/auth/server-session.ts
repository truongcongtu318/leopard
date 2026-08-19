import 'server-only';

import { cookies } from 'next/headers';

import { ApiError } from '../api/api-error';
import { ADMIN_ACCESS_COOKIE, getApiBaseUrl } from './bff-session';
import type { Role } from './role-policy';

export type VerifiedOperationsUser = Readonly<{
  id: string;
  role: Role;
}>;

const OPERATIONS_ROLES: ReadonlySet<Role> = new Set(['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN']);

function isVerifiedProfile(value: unknown): value is {
  readonly id: string;
  readonly role: Role;
  readonly status: 'ACTIVE';
} {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === 'string' &&
    profile.id.length > 0 &&
    typeof profile.role === 'string' &&
    OPERATIONS_ROLES.has(profile.role as Role) &&
    profile.status === 'ACTIVE'
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

/**
 * Verify the opaque access token against the backend-owned `/me` boundary.
 * The returned projection intentionally omits phone and other profile fields.
 */
export async function fetchVerifiedOperationsUser(
  accessToken: string,
): Promise<VerifiedOperationsUser | null> {
  if (
    accessToken.length === 0 ||
    accessToken !== accessToken.trim() ||
    /[\r\n]/u.test(accessToken)
  ) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication service is unavailable');
  }

  if (response.status === 401 || response.status === 403) return null;

  const body = await readResponseBody(response);
  if (!response.ok) {
    throw await ApiError.fromResponse(response.status, body);
  }
  if (!isVerifiedProfile(body)) {
    throw new ApiError(
      502,
      'INVALID_UPSTREAM_RESPONSE',
      'Authentication profile response is invalid',
    );
  }

  return {
    id: body.id,
    role: body.role,
  };
}

export async function getVerifiedOperationsUser(): Promise<VerifiedOperationsUser | null> {
  const accessToken = (await cookies()).get(ADMIN_ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  return fetchVerifiedOperationsUser(accessToken);
}
