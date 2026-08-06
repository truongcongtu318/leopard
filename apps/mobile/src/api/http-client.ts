import { ApiError } from './api-error';
import { sessionStore } from '../auth/session-store';

// Base URL from environment variable, falls back to empty (relative) in dev
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Refresh endpoint path
const REFRESH_PATH = '/auth/refresh';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

// ---- concurrent refresh deduplication ----

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = await sessionStore.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': generateRequestId(),
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const body = (await response.json()) as {
      accessToken?: string;
      accessTokenExpiresAt?: string;
      refreshToken?: string;
      refreshTokenExpiresAt?: string;
    };

    if (body.accessToken && body.refreshToken) {
      await sessionStore.setSession(body.accessToken, body.refreshToken);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function startRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function refreshSession(): Promise<boolean> {
  return startRefresh();
}

// ---- request execution ----

async function request<T>(options: RequestOptions): Promise<T> {
  const headers = buildHeaders();
  const url = `${BASE_URL}${options.path}`;

  const init: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (networkError) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
  }

  // 401 -> attempt token refresh
  if (response.status === 401) {
    const refreshed = await startRefresh();
    if (refreshed) {
      // Retry original request with new token
      const retryHeaders = buildHeaders();
      const retryInit: RequestInit = {
        method: options.method,
        headers: retryHeaders,
      };
      if (options.body !== undefined) {
        retryInit.body = JSON.stringify(options.body);
      }

      let retryResponse: Response;
      try {
        retryResponse = await fetch(url, retryInit);
      } catch (networkError) {
        throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed after token refresh');
      }

      if (!retryResponse.ok) {
        const retryBody = await safeParseJson(retryResponse);
        throw await ApiError.fromResponse(retryResponse.status, retryBody);
      }

      return (await retryResponse.json()) as T;
    }

    // Refresh failed -> clear session and throw
    await sessionStore.clearSession();
    const body = await safeParseJson(response);
    throw await ApiError.fromResponse(response.status, body);
  }

  // Non-OK (not 401) -> throw
  if (!response.ok) {
    const body = await safeParseJson(response);
    throw await ApiError.fromResponse(response.status, body);
  }

  return (await response.json()) as T;
}

// ---- helpers ----

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': generateRequestId(),
  };

  const token = sessionStore.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function generateRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for environments without crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

// ---- public HTTP client ----

export const httpClient = {
  get<T = unknown>(path: string): Promise<T> {
    return request<T>({ method: 'GET', path });
  },

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: 'POST', path, body });
  },

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: 'PUT', path, body });
  },

  delete<T = unknown>(path: string): Promise<T> {
    return request<T>({ method: 'DELETE', path });
  },
};
