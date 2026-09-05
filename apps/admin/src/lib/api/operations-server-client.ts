import "server-only";

import { cookies } from "next/headers";

import { ApiError, safeParseJson } from "./api-error";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  getApiBaseUrl,
} from "../auth/bff-session";

export type ServerQuery = Record<string, string | number | undefined>;

function buildUrl(path: string, query?: ServerQuery): string {
  const url = new URL(`${getApiBaseUrl()}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function isUsableAccessToken(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim() &&
    !/[\r\n]/u.test(value)
  );
}

async function fetchWithBearer(
  url: string,
  accessToken: string,
): Promise<Response> {
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

/**
 * Refreshes the backend session for the CURRENT request only.
 *
 * Next.js Server Components cannot persist cookies (read-only in RSC), so the
 * rotated tokens are used for this request and the browser-side BFF proxy
 * (`/api/v1/[...path]`) will persist refreshed cookies on subsequent calls.
 */
async function refreshAccessTokenForRequest(
  refreshToken: string | undefined,
): Promise<string | null> {
  if (!isUsableAccessToken(refreshToken)) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { accessToken?: unknown };
    return typeof body.accessToken === "string" && body.accessToken.length > 0
      ? body.accessToken
      : null;
  } catch {
    return null;
  }
}

/**
 * Authenticated GET against the Leopard API from Server Components.
 * Reads the Bearer token from the httpOnly access cookie set by the auth
 * route handlers and retries once through /auth/refresh on 401.
 */
export async function operationsServerGet<T>(
  path: string,
  query?: ServerQuery,
): Promise<T> {
  const jar = await cookies();
  let accessToken = jar.get(ADMIN_ACCESS_COOKIE)?.value;
  if (!isUsableAccessToken(accessToken)) {
    throw new ApiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ");
  }

  const url = buildUrl(path, query);
  let response: Response;
  try {
    response = await fetchWithBearer(url, accessToken);
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ API");
  }

  if (response.status === 401) {
    const refreshed = await refreshAccessTokenForRequest(
      jar.get(ADMIN_REFRESH_COOKIE)?.value,
    );
    if (refreshed) {
      accessToken = refreshed;
      try {
        response = await fetchWithBearer(url, accessToken);
      } catch {
        throw new ApiError(0, "NETWORK_ERROR", "Không thể kết nối máy chủ API");
      }
    }
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response.status, await safeParseJson(response));
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      502,
      "INVALID_UPSTREAM_RESPONSE",
      "Phản hồi từ máy chủ API không hợp lệ",
    );
  }
}

/** GET for public endpoints (health probes) with no authentication. */
export async function publicServerGet<T>(
  path: string,
): Promise<{ ok: boolean; status: number; body: T | null }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return { ok: response.ok, status: response.status, body: (await response.json()) as T };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}
