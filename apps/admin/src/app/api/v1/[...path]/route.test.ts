import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

type FetchMock = jest.Mock<(...args: unknown[]) => Promise<Response>>;

function fetchMock(): FetchMock {
  return globalThis.fetch as FetchMock;
}

function createMockResponse(
  status: number,
  body: unknown,
  headers = new Headers({ "Content-Type": "application/json" }),
): Response {
  const bodyString = typeof body === "string" ? body : JSON.stringify(body);
  const bodyBytes = new TextEncoder().encode(bodyString);

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers,
    json: () => Promise.resolve(JSON.parse(bodyString)),
    text: () => Promise.resolve(bodyString),
    arrayBuffer: () => Promise.resolve(bodyBytes.buffer),
  } as Response;
}

function request(
  path: string,
  options: { cookie?: string; method?: string; body?: unknown; origin?: string } = {},
): Request {
  const headers = new Headers();
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.origin) headers.set("Origin", options.origin);

  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  return {
    url: `http://localhost:3002${path}`,
    method: options.method ?? "GET",
    headers,
    arrayBuffer: () =>
      Promise.resolve(new TextEncoder().encode(body ?? "").buffer),
  } as unknown as Request;
}

const context = {
  params: Promise.resolve({ path: ["orders"] }),
};

describe("admin API BFF proxy", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalApiUrl: string | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalApiUrl = process.env.API_URL;
    process.env.API_URL = "http://api.test/api/v1";
    globalThis.fetch = jest.fn() as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
    jest.restoreAllMocks();
  });

  it("forwards the request with the access token kept in the httpOnly cookie", async () => {
    const { GET } = await import("./route");
    fetchMock().mockResolvedValueOnce(createMockResponse(200, { data: [{ id: "ord-1" }] }));

    const response = await GET(
      request("/api/v1/orders?status=ACTIVE", {
        cookie: "leopard.admin.access=access-1; leopard.admin.refresh=refresh-1",
      }),
      { params: Promise.resolve({ path: ["orders"] }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "ord-1" }] });
    expect(fetchMock().mock.calls[0]).toEqual([
      "http://api.test/api/v1/orders?status=ACTIVE",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer access-1" }),
      }),
    ]);
  });

  it("refreshes once on a 401, retries the request, and rotates both cookies", async () => {
    const { GET } = await import("./route");
    fetchMock()
      .mockResolvedValueOnce(createMockResponse(401, { code: "TOKEN_EXPIRED" }))
      .mockResolvedValueOnce(createMockResponse(200, {
        accessToken: "access-2",
        accessTokenExpiresAt: "2026-08-06T02:20:00.000Z",
        refreshToken: "refresh-2",
        refreshTokenExpiresAt: "2026-08-13T02:20:00.000Z",
      }))
      .mockResolvedValueOnce(createMockResponse(200, { data: [{ id: "ord-1" }] }));

    const response = await GET(
      request("/api/v1/orders", {
        cookie: "leopard.admin.access=expired; leopard.admin.refresh=refresh-1",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "ord-1" }] });
    expect(fetchMock().mock.calls).toHaveLength(3);
    expect(fetchMock().mock.calls[1]).toEqual([
      "http://api.test/api/v1/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "refresh-1" }),
      }),
    ]);
    expect(fetchMock().mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer access-2" }),
      }),
    );
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringMatching(/leopard\.admin\.access=access-2/),
    );
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringMatching(/leopard\.admin\.refresh=refresh-2/),
    );
  });

  it("rejects cross-site cookie-backed mutations before reaching the backend", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      request("/api/v1/orders", {
        method: "POST",
        body: { pickup: "A", dropoff: "B" },
        cookie: "leopard.admin.access=access-1; leopard.admin.refresh=refresh-1",
        origin: "https://evil.example",
      }),
      context,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "CSRF_FORBIDDEN",
      message: "Cross-site request blocked",
    });
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("requires origin metadata for production mutations", async () => {
    const { POST } = await import("./route");
    const previousNodeEnv = process.env.NODE_ENV;
    const mutableEnv = process.env as unknown as Record<string, string | undefined>;
    mutableEnv.NODE_ENV = "production";

    try {
      const response = await POST(
        request("/api/v1/orders", {
          method: "POST",
          body: { pickup: "A", dropoff: "B" },
          cookie: "leopard.admin.access=access-1",
        }),
        context,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        code: "CSRF_FORBIDDEN",
        message: "Cross-site request blocked",
      });
      expect(fetchMock()).not.toHaveBeenCalled();
    } finally {
      if (previousNodeEnv === undefined) {
        delete mutableEnv.NODE_ENV;
      } else {
        mutableEnv.NODE_ENV = previousNodeEnv;
      }
    }
  });
});
