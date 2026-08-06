import { ApiError } from "./api-error";
import { clearSession } from "../auth/session";

/**
 * Browser fetch-based API client.
 *
 * Uses same-origin BFF pattern — all requests go to relative /api/v1.
 * On 401: clears session, redirects to /login.
 * On 403: throws ApiError with FORBIDDEN.
 * Network errors → ApiError with statusCode 0.
 */

const BASE_URL = "/api/v1";

function generateRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for environments without crypto.randomUUID()
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

const _headers: Record<string, string> = {};

function buildHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-request-id": generateRequestId(),
    ..._headers,
  };
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers = buildHeaders();
  const url = `${BASE_URL}${path}`;

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Network request failed");
  }

  // 401 → clear session, redirect to login
  if (response.status === 401) {
    await clearSession();
    // Redirect to /login in the browser
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    const body = await safeParseJson(response);
    throw await ApiError.fromResponse(response.status, body);
  }

  // Non-OK → throw
  if (!response.ok) {
    const body = await safeParseJson(response);
    throw await ApiError.fromResponse(response.status, body);
  }

  return (await response.json()) as T;
}

export const browserClient = {
  _headers,

  get<T = unknown>(path: string): Promise<T> {
    return request<T>("GET", path);
  },

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, body);
  },

  delete<T = unknown>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },

  setHeader(key: string, value: string): void {
    _headers[key] = value;
  },
};
