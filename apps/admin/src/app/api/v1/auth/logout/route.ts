import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  type BackendAuthSession,
  clearSessionCookies,
  csrfErrorResponse,
  isBackendAuthSession,
  postBackendJson,
  readCookie,
  readResponseBody,
} from "../../../../../lib/auth/bff-session";

export async function POST(request: Request): Promise<Response> {
  const csrfError = csrfErrorResponse(request);
  if (csrfError) return csrfError;

  const accessToken = readCookie(request, ADMIN_ACCESS_COOKIE);
  const refreshToken = readCookie(request, ADMIN_REFRESH_COOKIE);

  let revoked = accessToken
    ? await revokeBackendSession(accessToken)
    : false;

  // An expired access token cannot reach the backend logout endpoint. Rotate
  // once with the refresh cookie, then revoke the fresh access-token session.
  if (!revoked && refreshToken) {
    try {
      const refreshResponse = await postBackendJson<BackendAuthSession>(
        "/auth/refresh",
        { refreshToken },
      );
      if (refreshResponse.ok) {
        const body = await readResponseBody(refreshResponse);
        if (isBackendAuthSession(body)) {
          revoked = await revokeBackendSession(body.accessToken);
        }
      }
    } catch {
      // Cookie cleanup must complete even when backend logout is unavailable.
    }
  }

  const response = new Response(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}

async function revokeBackendSession(accessToken: string): Promise<boolean> {
  try {
    const response = await postBackendJson("/auth/logout", undefined, {
      Authorization: `Bearer ${accessToken}`,
    });
    return response.ok;
  } catch {
    return false;
  }
}
