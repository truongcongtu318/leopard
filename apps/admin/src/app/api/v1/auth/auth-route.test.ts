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

  it("sets an httpOnly refresh cookie on demo login without returning the refresh token to the browser", async () => {
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
        accessToken: "access-1",
        accessTokenExpiresAt: "2026-08-06T02:15:00.000Z",
      },
    });
    expect(JSON.stringify(body)).not.toContain("refresh-1");
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringContaining("HttpOnly"),
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
        accessToken: "access-2",
        accessTokenExpiresAt: "2026-08-06T02:20:00.000Z",
      },
    });
    expect(JSON.stringify(body)).not.toContain("refresh-2");
    expect(response.headers.get("set-cookie")).toEqual(
      expect.stringContaining("leopard.admin.refresh=refresh-2"),
    );
  });
});
