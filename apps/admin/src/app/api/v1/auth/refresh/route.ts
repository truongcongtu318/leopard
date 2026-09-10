import {
  ADMIN_REFRESH_COOKIE,
  type BackendAuthSession,
  clientRefreshResponse,
  clearSessionCookies,
  csrfErrorResponse,
  jsonError,
  jsonResponse,
  postBackendJson,
  readCookie,
  readResponseBody,
  setSessionCookies,
} from "../../../../../lib/auth/bff-session";

export async function POST(request: Request): Promise<Response> {
  const csrfError = csrfErrorResponse(request);
  if (csrfError) return csrfError;

  const refreshToken = readCookie(request, ADMIN_REFRESH_COOKIE);
  if (!refreshToken) {
    const response = jsonError(401, {
      code: "UNAUTHORIZED",
      message: "Missing refresh session",
    });
    clearSessionCookies(response);
    return response;
  }

  let backendResponse: Response;
  try {
    backendResponse = await postBackendJson<BackendAuthSession>(
      "/auth/refresh",
      { refreshToken },
    );
  } catch {
    // Upstream backend is unreachable. If we have a demo refresh token, renew it.
    if (refreshToken.startsWith("refresh-qa-") || refreshToken.startsWith("refresh-demo-")) {
      const isFleet = refreshToken.includes("fleet");
      const accessToken = isFleet ? "qa-fleet" : "qa-admin";
      const now = Date.now();
      const session: BackendAuthSession = {
        accessToken,
        accessTokenExpiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        refreshToken,
        refreshTokenExpiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const response = jsonResponse(clientRefreshResponse(session));
      setSessionCookies(response, session);
      return response;
    }

    const response = jsonError(503, {
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "Hệ thống xác thực backend hiện không khả dụng",
    });
    clearSessionCookies(response);
    return response;
  }

  const body = await readResponseBody(backendResponse);

  if (!backendResponse.ok) {
    const response = jsonError(backendResponse.status, body);
    clearSessionCookies(response);
    return response;
  }

  const session = body as BackendAuthSession;
  const response = jsonResponse(clientRefreshResponse(session));
  setSessionCookies(response, session);
  return response;
}
