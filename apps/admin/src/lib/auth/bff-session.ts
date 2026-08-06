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
    role: "CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN";
    status: string;
  };
  session: BackendAuthSession;
}

export function getApiBaseUrl(): string {
  return process.env.API_URL ?? "http://localhost:3000/api/v1";
}

export async function postBackendJson<T>(
  path: string,
  body: unknown,
): Promise<Response> {
  return fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

export function clientAuthResponse(
  backend: BackendAuthResponse,
): {
  user: BackendAuthResponse["user"];
  session: Pick<BackendAuthSession, "accessToken" | "accessTokenExpiresAt">;
} {
  return {
    user: backend.user,
    session: {
      accessToken: backend.session.accessToken,
      accessTokenExpiresAt: backend.session.accessTokenExpiresAt,
    },
  };
}

export function clientRefreshResponse(
  session: BackendAuthSession,
): {
  session: Pick<BackendAuthSession, "accessToken" | "accessTokenExpiresAt">;
} {
  return {
    session: {
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
    },
  };
}

export function setRefreshCookie(
  response: Response,
  session: BackendAuthSession,
): void {
  response.headers.append(
    "Set-Cookie",
    serializeCookie(ADMIN_REFRESH_COOKIE, session.refreshToken, {
      expires: new Date(session.refreshTokenExpiresAt),
      maxAge: undefined,
    }),
  );
}

export function clearRefreshCookie(response: Response): void {
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

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function jsonError(status: number, body: unknown): Response {
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
