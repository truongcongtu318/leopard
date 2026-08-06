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

  const backendResponse = await postBackendJson<BackendAuthSession>(
    "/auth/refresh",
    { refreshToken },
  );
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
