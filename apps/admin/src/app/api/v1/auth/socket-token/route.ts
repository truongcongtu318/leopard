import {
  ADMIN_ACCESS_COOKIE,
  jsonError,
  jsonResponse,
  readCookie,
} from "../../../../../lib/auth/bff-session";

export async function GET(request: Request): Promise<Response> {
  const token = readCookie(request, ADMIN_ACCESS_COOKIE);
  if (!token) {
    return jsonError(401, {
      code: "UNAUTHORIZED",
      message: "Missing authentication token",
    });
  }
  return jsonResponse({ token });
}
