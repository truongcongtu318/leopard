import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ApiError } from "./api-error";
import {
  clearSession,
  getSession,
  setSession,
} from "../auth/session";

type FetchMock = jest.Mock<(...args: unknown[]) => Promise<Response>>;

function fetchMock(): FetchMock {
  return globalThis.fetch as FetchMock;
}

function lastFetchArgs(): [string, RequestInit | undefined] {
  const calls = fetchMock().mock.calls;
  return calls[calls.length - 1] as [string, RequestInit | undefined];
}

function createMockResponse(status: number, body: unknown): Response {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () =>
      Promise.resolve(typeof body === "string" ? JSON.parse(body) : body),
    text: () => Promise.resolve(bodyStr),
    headers: new Headers(),
    redirected: false,
    type: "basic" as ResponseType,
    url: "",
    clone: () =>
      createMockResponse(status, body) as unknown as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response;
}

function createOneShotTextResponse(status: number, body: string): Response {
  let consumed = false;
  const readText = () => {
    if (consumed) {
      return Promise.reject(new TypeError("Body is unusable"));
    }
    consumed = true;
    return Promise.resolve(body);
  };

  return {
    ok: false,
    status,
    statusText: "Error",
    json: async () => JSON.parse(await readText()),
    text: readText,
    headers: new Headers({ "Content-Type": "text/plain" }),
  } as Response;
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  describe("fromResponse", () => {
    it("creates ApiError from a valid error envelope body", async () => {
      const error = await ApiError.fromResponse(422, {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        requestId: "req-abc",
        details: { field: "name" },
      });

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Invalid input");
      expect(error.requestId).toBe("req-abc");
      expect(error.details).toEqual({ field: "name" });
    });

    it("falls back to INTERNAL_ERROR for non-envelope bodies", async () => {
      const error = await ApiError.fromResponse(500, "plain text error");

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
    });

    it("falls back to INTERNAL_ERROR for null/undefined bodies", async () => {
      const error = await ApiError.fromResponse(500, null);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
    });

    it("stringifies object bodies that lack code/message", async () => {
      const error = await ApiError.fromResponse(500, { foo: "bar" });

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.message).toBe('{"foo":"bar"}');
    });
  });

  describe("isApiError", () => {
    it("returns true for ApiError instances", () => {
      const error = new ApiError(400, "BAD_REQUEST", "msg");
      expect(ApiError.isApiError(error)).toBe(true);
    });

    it("returns false for regular Error", () => {
      expect(ApiError.isApiError(new Error("boom"))).toBe(false);
    });

    it("returns false for non-Error values", () => {
      expect(ApiError.isApiError("string")).toBe(false);
      expect(ApiError.isApiError(null)).toBe(false);
      expect(ApiError.isApiError({ code: "X", message: "Y" })).toBe(false);
    });
  });

  describe("constructor", () => {
    it("sets name to ApiError", () => {
      const error = new ApiError(400, "BAD_REQUEST", "msg");
      expect(error.name).toBe("ApiError");
    });

    it("accepts optional requestId and details", () => {
      const error = new ApiError(
        500,
        "INTERNAL_ERROR",
        "msg",
        "rid-1",
        { extra: true },
      );
      expect(error.requestId).toBe("rid-1");
      expect(error.details).toEqual({ extra: true });
    });
  });
});

// ---------------------------------------------------------------------------
// Server client
// ---------------------------------------------------------------------------

describe("serverClient", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalApiUrl: string | undefined;
  let serverClient: typeof import("./server-client").serverClient;

  beforeAll(async () => {
    const mod = await import("./server-client");
    serverClient = mod.serverClient;
  });

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalApiUrl = process.env.API_URL;
    globalThis.fetch = jest.fn() as unknown as typeof globalThis.fetch;
    // Reset module-level base URL by re-setting env
    process.env.API_URL = "http://localhost:3000/api/v1";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.API_URL = originalApiUrl;
    jest.restoreAllMocks();
  });

  it("performs GET request", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    const result = await serverClient.get<{ data: string }>("/orders");

    const [url, init] = lastFetchArgs();
    expect(init?.method).toBe("GET");
    expect(url).toContain("/orders");
    expect(result.data).toBe("ok");
  });

  it("performs POST request with body", async () => {
    fetchMock().mockResolvedValue(createMockResponse(201, { id: 1 }));

    await serverClient.post<{ id: number }>("/orders", { name: "test" });

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ name: "test" }));
  });

  it("performs PUT request with body", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { id: 2 }));

    await serverClient.put<{ id: number }>("/orders/2", { name: "updated" });

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe("PUT");
  });

  it("performs DELETE request", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, {}));

    await serverClient.delete("/orders/3");

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe("DELETE");
  });

  it("attaches x-request-id header", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    await serverClient.get("/test");

    const [, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.["x-request-id"]).toBeDefined();
    expect(headers?.["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("generates unique x-request-id per request", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    await serverClient.get("/a");
    await serverClient.get("/b");

    const calls = fetchMock().mock.calls;
    const req1 = calls[0]?.[1] as RequestInit | undefined;
    const req2 = calls[1]?.[1] as RequestInit | undefined;
    const headers1 = req1?.headers as Record<string, string> | undefined;
    const headers2 = req2?.headers as Record<string, string> | undefined;
    expect(headers1?.["x-request-id"]).toBeDefined();
    expect(headers2?.["x-request-id"]).toBeDefined();
    expect(headers1!["x-request-id"]).not.toBe(headers2!["x-request-id"]);
  });

  it("throws ApiError on non-OK response", async () => {
    fetchMock().mockResolvedValue(
      createMockResponse(500, { code: "INTERNAL_ERROR", message: "boom" }),
    );

    await expect(serverClient.get("/error")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 500,
      code: "INTERNAL_ERROR",
    });
  });

  it("handles one-shot plain-text server errors", async () => {
    fetchMock().mockResolvedValue(createOneShotTextResponse(503, "upstream unavailable"));

    await expect(serverClient.get("/error")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 503,
      message: "upstream unavailable",
    });
  });

  it("does not set Authorization header", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    await serverClient.get("/test");

    const [, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  it("uses API_URL env var as base URL", async () => {
    process.env.API_URL = "https://custom-api.example.com/v2";
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    await serverClient.get("/path");

    const [url] = lastFetchArgs();
    expect(url).toBe("https://custom-api.example.com/v2/path");
  });

  it("defaults base URL when API_URL is not set", async () => {
    delete (process.env as Record<string, string | undefined>).API_URL;
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    await serverClient.get("/path");

    const [url] = lastFetchArgs();
    expect(url).toBe("http://localhost:3000/api/v1/path");
  });
});

// ---------------------------------------------------------------------------
// Browser client
// ---------------------------------------------------------------------------

describe("browserClient", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalLocation: Location;
  let browserClient: typeof import("./browser-client").browserClient;

  beforeAll(async () => {
    const mod = await import("./browser-client");
    browserClient = mod.browserClient;
  });

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalLocation = (globalThis as Record<string, unknown>).location as Location;
    globalThis.fetch = jest.fn() as unknown as typeof globalThis.fetch;
    delete (globalThis as Record<string, unknown>).location;
    (globalThis as Record<string, unknown>).location = {
      href: "http://localhost:3002/dashboard",
      assign: jest.fn(),
      replace: jest.fn(),
    };
    // Reset session state
    setSession(null as unknown as never).catch(() => {});
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    (globalThis as Record<string, unknown>).location = originalLocation;
    await clearSession();
    jest.restoreAllMocks();
  });

  it("performs GET request with relative URL", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    const result = await browserClient.get<{ data: string }>("/orders");

    const [url, init] = lastFetchArgs();
    expect(init?.method).toBe("GET");
    expect(url).toBe("/api/v1/orders");
    expect(result.data).toBe("ok");
  });

  it("performs POST with body", async () => {
    fetchMock().mockResolvedValue(createMockResponse(201, { id: 1 }));

    await browserClient.post<{ id: number }>("/orders", { name: "test" });

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ name: "test" }));
  });

  it("performs PUT with body", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { id: 2 }));

    await browserClient.put<{ id: number }>("/orders/2", { name: "updated" });

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe("PUT");
  });

  it("performs DELETE", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, {}));

    await browserClient.delete("/orders/3");

    const [, init] = lastFetchArgs();
    expect(init?.method).toBe("DELETE");
  });

  it("attaches x-request-id header", async () => {
    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    await browserClient.get("/test");

    const [, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.["x-request-id"]).toBeDefined();
  });

  it("on 401 clears session and redirects to /login", async () => {
    // Set up a session
    await setSession({
      userId: "u1",
      role: "ADMIN",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    fetchMock().mockResolvedValue(
      createMockResponse(401, { code: "UNAUTHORIZED", message: "Token expired" }),
    );

    await expect(browserClient.get("/protected")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 401,
    });

    const session = await getSession();
    expect(session).toBeNull();
    expect((globalThis as Record<string, unknown>).location).toMatchObject({
      href: "/login",
    });
  });

  it("refreshes through the BFF after reload or access expiry and retries once", async () => {
    await setSession({
      userId: "u1",
      role: "ADMIN",
      expiresAt: "2026-08-06T02:00:00.000Z",
    });

    fetchMock()
      .mockResolvedValueOnce(
        createMockResponse(401, { code: "UNAUTHORIZED", message: "Token expired" }),
      )
      .mockResolvedValueOnce(
        createMockResponse(200, {
          session: {
            accessTokenExpiresAt: "2026-08-06T02:15:00.000Z",
          },
        }),
      )
      .mockResolvedValueOnce(createMockResponse(200, { data: "ok" }));

    const result = await browserClient.get<{ data: string }>("/admin/dashboard");

    expect(result).toEqual({ data: "ok" });
    expect(fetchMock()).toHaveBeenCalledTimes(3);
    expect(fetchMock().mock.calls[1]?.[0]).toBe("/api/v1/auth/refresh");

    const retry = fetchMock().mock.calls[2]?.[1] as RequestInit | undefined;
    const retryHeaders = retry?.headers as Record<string, string> | undefined;
    expect(retryHeaders?.Authorization).toBeUndefined();

    await expect(getSession()).resolves.toEqual({
      userId: "u1",
      role: "ADMIN",
      expiresAt: "2026-08-06T02:15:00.000Z",
    });
  });

  it("cleans up session and cookies when 401 refresh fails", async () => {
    await setSession({
      userId: "u1",
      role: "ADMIN",
      expiresAt: "2026-08-06T02:00:00.000Z",
    });

    fetchMock()
      .mockResolvedValueOnce(
        createMockResponse(401, { code: "UNAUTHORIZED", message: "Token expired" }),
      )
      .mockResolvedValueOnce(
        createMockResponse(401, { code: "UNAUTHORIZED", message: "Refresh expired" }),
      )
      .mockResolvedValueOnce(createMockResponse(204, ""));

    await expect(browserClient.get("/admin/dashboard")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 401,
    });

    await expect(getSession()).resolves.toBeNull();
    expect(fetchMock().mock.calls[2]?.[0]).toBe("/api/v1/auth/logout");
    expect((globalThis as Record<string, unknown>).location).toMatchObject({
      href: "/login",
    });

    fetchMock().mockResolvedValueOnce(createMockResponse(200, { data: "after-clear" }));
    await browserClient.get("/after-clear");
    const afterClear = fetchMock().mock.calls[3]?.[1] as RequestInit | undefined;
    const afterClearHeaders = afterClear?.headers as Record<string, string> | undefined;
    expect(afterClearHeaders?.Authorization).toBeUndefined();
  });

  it("on 403 throws ApiError with FORBIDDEN", async () => {
    fetchMock().mockResolvedValue(
      createMockResponse(403, {
        code: "FORBIDDEN",
        message: "Access denied",
      }),
    );

    await expect(browserClient.get("/admin-only")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("throws ApiError with statusCode 0 on network error", async () => {
    fetchMock().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(browserClient.get("/offline")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 0,
      code: "NETWORK_ERROR",
    });
  });

  it("throws ApiError for other non-OK statuses", async () => {
    fetchMock().mockResolvedValue(
      createMockResponse(422, {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
      }),
    );

    await expect(browserClient.post("/orders", {})).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 422,
      code: "VALIDATION_ERROR",
    });
  });

  it("handles one-shot plain-text browser errors", async () => {
    fetchMock().mockResolvedValue(createOneShotTextResponse(503, "upstream unavailable"));

    await expect(browserClient.get("/error")).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 503,
      message: "upstream unavailable",
    });
  });

  it("does not attach Authorization header (browser trusts cookies)", async () => {
    await setSession({
      userId: "u1",
      role: "ADMIN",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    fetchMock().mockResolvedValue(createMockResponse(200, { data: "ok" }));

    await browserClient.get("/test");

    const [, init] = lastFetchArgs();
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });
});
