import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

type FetchMock = jest.Mock<(...args: unknown[]) => Promise<Response>>;

function fetchMock(): FetchMock {
  return globalThis.fetch as FetchMock;
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
    clone: () => createMockResponse(status, body) as unknown as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response;
}

function jsonRequest(path: string, body: unknown, cookie?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("Cookie", cookie);
  return {
    url: `http://localhost:3002${path}`,
    method: "POST",
    headers,
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

describe("admin auth BFF routes", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn() as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("sets httpOnly auth cookies on demo login without returning bearer tokens to the browser", async () => {
    const { POST } = await import("./login/demo/route");
    fetchMock().mockResolvedValueOnce(createMockResponse(200, {
      user: { id: "usr-admin-1", phone: "0900000002", role: "ADMIN", status: "ACTIVE" },
      session: {
        accessToken: "access-1",
        accessTokenExpiresAt: "2026-08-06T02:15:00.000Z",
        refreshToken: "refresh-1",
        refreshTokenExpiresAt: "2026-08-13T02:15:00.000Z",
      },
    }));

    const response = await POST(jsonRequest("/api/v1/auth/login/demo", { accountId: "admin" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: { id: "usr-admin-1", phone: "0900000002", role: "ADMIN", status: "ACTIVE" },
      session: {
        accessTokenExpiresAt: "2026-08-06T02:15:00.000Z",
      },
    });
    expect(JSON.stringify(body)).not.toContain("refresh-1");
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringContaining("HttpOnly"),
    );
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringContaining("leopard.admin.access=access-1"),
    );
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringContaining("leopard.admin.refresh=refresh-1"),
    );
  });

  it("refreshes with the httpOnly cookie, rotates it, and does not expose the rotated refresh token", async () => {
    const { POST } = await import("./refresh/route");
    fetchMock().mockResolvedValueOnce(createMockResponse(200, {
      accessToken: "access-2",
      accessTokenExpiresAt: "2026-08-06T02:20:00.000Z",
      refreshToken: "refresh-2",
      refreshTokenExpiresAt: "2026-08-13T02:20:00.000Z",
    }));

    const response = await POST(jsonRequest(
      "/api/v1/auth/refresh",
      {},
      "leopard.admin.refresh=refresh-1",
    ));
    const body = await response.json();

    expect(fetchMock().mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ refreshToken: "refresh-1" }),
    });
    expect(body).toEqual({
      session: {
        accessTokenExpiresAt: "2026-08-06T02:20:00.000Z",
      },
    });
    expect(JSON.stringify(body)).not.toContain("refresh-2");
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringContaining("leopard.admin.refresh=refresh-2"),
    );
  });

  it("revokes the backend session before clearing auth cookies on logout", async () => {
    const { POST } = await import("./logout/route");
    fetchMock().mockResolvedValueOnce(createMockResponse(204, ""));

    const response = await POST(jsonRequest(
      "/api/v1/auth/logout",
      {},
      "leopard.admin.access=access-1; leopard.admin.refresh=refresh-1",
    ));

    expect(response.status).toBe(204);
    expect(fetchMock().mock.calls[0]).toEqual([
      "http://localhost:3000/api/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-1" }),
      }),
    ]);
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringMatching(/leopard\.admin\.access=;.*Max-Age=0/),
    );
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringMatching(/leopard\.admin\.refresh=;.*Max-Age=0/),
    );
  });

  it("rotates and revokes through the refresh cookie when the access token expired", async () => {
    const { POST } = await import("./logout/route");
    fetchMock()
      .mockResolvedValueOnce(createMockResponse(401, { code: "UNAUTHORIZED" }))
      .mockResolvedValueOnce(createMockResponse(200, {
        accessToken: "fresh-access",
        accessTokenExpiresAt: "2026-08-06T02:20:00.000Z",
        refreshToken: "fresh-refresh",
        refreshTokenExpiresAt: "2026-08-13T02:20:00.000Z",
      }))
      .mockResolvedValueOnce(createMockResponse(204, ""));

    await POST(jsonRequest(
      "/api/v1/auth/logout",
      {},
      "leopard.admin.access=expired; leopard.admin.refresh=refresh-1",
    ));

    expect(fetchMock()).toHaveBeenCalledTimes(3);
    expect(fetchMock().mock.calls[1]?.[0]).toBe(
      "http://localhost:3000/api/v1/auth/refresh",
    );
    expect(fetchMock().mock.calls[2]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer fresh-access" }),
    });
  });

  it("returns plain-text backend errors without reading the response body twice", async () => {
    const { POST } = await import("./login/demo/route");
    fetchMock().mockResolvedValueOnce(createOneShotTextResponse(503, "provider unavailable"));

    const response = await POST(jsonRequest("/api/v1/auth/login/demo", { accountId: "admin" }));

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe("provider unavailable");
  });
});

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
