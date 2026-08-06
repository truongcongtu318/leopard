import {
  ADMIN_REFRESH_COOKIE,
  type BackendAuthSession,
  clientRefreshResponse,
  clearRefreshCookie,
  jsonError,
  jsonResponse,
  postBackendJson,
  readCookie,
  readResponseBody,
  setRefreshCookie,
} from "../../../../../lib/auth/bff-session";

export async function POST(request: Request): Promise<Response> {
  const refreshToken = readCookie(request, ADMIN_REFRESH_COOKIE);
  if (!refreshToken) {
    const response = jsonError(401, {
      code: "UNAUTHORIZED",
      message: "Missing refresh session",
    });
    clearRefreshCookie(response);
    return response;
  }

  const backendResponse = await postBackendJson<BackendAuthSession>(
    "/auth/refresh",
    { refreshToken },
  );
  const body = await readResponseBody(backendResponse);

  if (!backendResponse.ok) {
    const response = jsonError(backendResponse.status, body);
    clearRefreshCookie(response);
    return response;
  }

  const session = body as BackendAuthSession;
  const response = jsonResponse(clientRefreshResponse(session));
  setRefreshCookie(response, session);
  return response;
}
