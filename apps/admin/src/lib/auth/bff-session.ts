export const ADMIN_ACCESS_COOKIE = "leopard.admin.access";
export const ADMIN_REFRESH_COOKIE = "leopard.admin.refresh";

export interface BackendAuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface BackendAuthResponse {
  user: {
    id: string;
    phone: string;
    // Intent: mirror backend Role enum (still includes FLEET_OWNER upstream);
    // admin web itself only grants ADMIN via role-policy guard.
    role: "CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN";
    status: string;
  };
  session: BackendAuthSession;
}

export function isBackendAuthSession(value: unknown): value is BackendAuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<BackendAuthSession>;
  return (
    typeof session.accessToken === "string" &&
    typeof session.accessTokenExpiresAt === "string" &&
    typeof session.refreshToken === "string" &&
    typeof session.refreshTokenExpiresAt === "string"
  );
}

export function getApiBaseUrl(): string {
  return process.env.API_URL ?? "http://localhost:3000/api/v1";
}

export async function postBackendJson<T>(
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return fetch(`${getApiBaseUrl()}${path}`, init);
}

export async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function clientAuthResponse(
  backend: BackendAuthResponse,
): {
  user: BackendAuthResponse["user"];
  session: Pick<BackendAuthSession, "accessTokenExpiresAt">;
} {
  return {
    user: backend.user,
    session: {
      accessTokenExpiresAt: backend.session.accessTokenExpiresAt,
    },
  };
}

export function clientRefreshResponse(
  session: BackendAuthSession,
): {
  session: Pick<BackendAuthSession, "accessTokenExpiresAt">;
} {
  return {
    session: {
      accessTokenExpiresAt: session.accessTokenExpiresAt,
    },
  };
}

export function setSessionCookies(
  response: Response,
  session: BackendAuthSession,
): void {
  response.headers.append(
    "Set-Cookie",
    serializeCookie(ADMIN_ACCESS_COOKIE, session.accessToken, {
      expires: new Date(session.accessTokenExpiresAt),
      maxAge: undefined,
    }),
  );
  response.headers.append(
    "Set-Cookie",
    serializeCookie(ADMIN_REFRESH_COOKIE, session.refreshToken, {
      expires: new Date(session.refreshTokenExpiresAt),
      maxAge: undefined,
    }),
  );
}

export function clearSessionCookies(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    serializeCookie(ADMIN_ACCESS_COOKIE, "", {
      expires: undefined,
      maxAge: 0,
    }),
  );
  response.headers.append(
    "Set-Cookie",
    serializeCookie(ADMIN_REFRESH_COOKIE, "", {
      expires: undefined,
      maxAge: 0,
    }),
  );
}

export function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

/**
 * Origins this request could legitimately have been sent to.
 *
 * `new URL(request.url).origin` is only one of them, because Next.js builds that
 * URL from the hostname the server was initialised with. Behind a reverse proxy
 * that is an internal name (`admin:3002`), which never equals the public origin
 * the browser sends in `Origin` — so every proxied POST was rejected as
 * cross-site and the admin console could not be logged into through the gateway
 * at all. The proxy's own forwarding headers carry the public host, so the check
 * accepts a match against those too.
 */
function requestOrigins(request: Request): string[] {
  const origins: string[] = [];
  const add = (value: string | null): void => {
    if (value && !origins.includes(value)) origins.push(value);
  };

  try {
    add(new URL(request.url).origin);
  } catch {
    // A malformed url just means this candidate cannot be used.
  }

  const scheme = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.trim() ??
    null;
  if (forwardedHost) {
    add(scheme ? `${scheme}://${forwardedHost}` : `https://${forwardedHost}`);
  }

  return origins;
}

export function isSameOriginRequest(request: Request): boolean {
  const allowedOrigins = requestOrigins(request);

  const origin = request.headers.get("origin");
  if (origin) return allowedOrigins.includes(origin);

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return allowedOrigins.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV !== "production";
}

export function csrfErrorResponse(request: Request): Response | null {
  if (isSameOriginRequest(request)) return null;

  return jsonError(403, {
    code: "CSRF_FORBIDDEN",
    message: "Cross-site request blocked",
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function jsonError(status: number, body: unknown): Response {
  if (typeof body === "string") {
    return new Response(body, {
      status,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return jsonResponse(body, status);
}

function serializeCookie(
  name: string,
  value: string,
  options: { expires: Date | undefined; maxAge: number | undefined },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  return parts.join("; ");
}
