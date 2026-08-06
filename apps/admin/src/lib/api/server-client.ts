import { ApiError } from "./api-error";

/**
 * Next.js server component / route handler API client.
 *
 * Designed for server-side use (RSC, route handlers, Server Actions).
 * Does NOT handle auth tokens — server-side calls rely on cookies or
 * service-to-service credentials that the Next.js server manages.
 *
 * Base URL is read from the API_URL env var (default http://localhost:3000/api/v1).
 */

function getBaseUrl(): string {
  return process.env.API_URL ?? "http://localhost:3000/api/v1";
}

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

function buildHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-request-id": generateRequestId(),
  };
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
  const url = `${getBaseUrl()}${path}`;

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

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    throw await ApiError.fromResponse(response.status, errorBody);
  }

  return (await response.json()) as T;
}

export const serverClient = {
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
};
