import {
  type BackendAuthResponse,
  clientAuthResponse,
  jsonError,
  jsonResponse,
  postBackendJson,
  readResponseBody,
  setSessionCookies,
} from "../../../../../../lib/auth/bff-session";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json();
  const backendResponse = await postBackendJson<BackendAuthResponse>(
    "/auth/login/demo",
    payload,
  );
  const body = await readResponseBody(backendResponse);

  if (!backendResponse.ok) {
    return jsonError(backendResponse.status, body);
  }

  const authBody = body as BackendAuthResponse;
  const response = jsonResponse(clientAuthResponse(authBody));
  setSessionCookies(response, authBody.session);
  return response;
}
