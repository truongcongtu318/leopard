import { ApiError } from "./api-error";
import { clearSession, updateSessionExpiry } from "../auth/session";

/**
 * Browser fetch-based API client.
 *
 * Uses same-origin BFF pattern — all requests go to relative /api/v1.
 * On 401: refreshes the httpOnly BFF session once, then redirects to /login.
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

let refreshPromise: Promise<boolean> | null = null;

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-request-id": generateRequestId(),
  };

  return headers;
}

async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
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
    credentials: "same-origin",
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

  if (response.status === 401) {
    const refreshed = shouldAttemptRefresh(path)
      ? await startRefresh()
      : false;

    if (refreshed) {
      const retryInit: RequestInit = {
        method,
        headers: buildHeaders(),
        credentials: "same-origin",
      };
      if (body !== undefined) {
        retryInit.body = JSON.stringify(body);
      }

      let retryResponse: Response;
      try {
        retryResponse = await fetch(url, retryInit);
      } catch {
        throw new ApiError(0, "NETWORK_ERROR", "Network request failed after token refresh");
      }

      if (!retryResponse.ok) {
        const retryBody = await safeParseJson(retryResponse);
        throw await ApiError.fromResponse(retryResponse.status, retryBody);
      }

      return (await retryResponse.json()) as T;
    }

    await cleanupBrowserSession();
    const errorBody = await safeParseJson(response);
    throw await ApiError.fromResponse(response.status, errorBody);
  }

  // Non-OK → throw
  if (!response.ok) {
    const body = await safeParseJson(response);
    throw await ApiError.fromResponse(response.status, body);
  }

  return (await response.json()) as T;
}

function shouldAttemptRefresh(path: string): boolean {
  return path !== "/auth/refresh" && path !== "/auth/logout";
}

function startRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "same-origin",
    });

    if (!response.ok) return false;

    const body = (await response.json()) as {
      session?: {
        accessTokenExpiresAt?: string;
      };
    };

    if (body.session?.accessTokenExpiresAt) {
      await updateSessionExpiry(body.session.accessTokenExpiresAt);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function cleanupBrowserSession(): Promise<void> {
  await clearSession();
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "same-origin",
    });
  } catch {
    // Local cleanup must complete even if cookie cleanup cannot be reached.
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export const browserClient = {
  get<T = unknown>(path: string): Promise<T> {
    return request<T>("GET", path);
  },

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, body);
  },

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  },

  delete<T = unknown>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },

  setHeader(_key: string, _value: string): void {},
};
