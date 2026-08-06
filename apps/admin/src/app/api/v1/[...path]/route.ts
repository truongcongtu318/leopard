import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  type BackendAuthSession,
  clearSessionCookies,
  getApiBaseUrl,
  isBackendAuthSession,
  postBackendJson,
  readCookie,
  readResponseBody,
  setSessionCookies,
} from "../../../../lib/auth/bff-session";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const RESPONSE_HEADERS = [
  "cache-control",
  "content-disposition",
  "content-type",
  "etag",
  "x-request-id",
];

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

async function proxyRequest(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const body = await readRequestBody(request);
  const accessToken = readCookie(request, ADMIN_ACCESS_COOKIE);

  const upstreamResponse = await fetchBackendRequest(
    request,
    path,
    accessToken,
    body,
  );

  if (upstreamResponse.status !== 401) {
    return createProxyResponse(upstreamResponse);
  }

  const refreshToken = readCookie(request, ADMIN_REFRESH_COOKIE);
  if (!refreshToken) {
    return createProxyResponse(upstreamResponse);
  }

  const session = await refreshBackendSession(refreshToken);
  if (!session) {
    const response = await createProxyResponse(upstreamResponse);
    clearSessionCookies(response);
    return response;
  }

  const retryResponse = await fetchBackendRequest(
    request,
    path,
    session.accessToken,
    body,
  );
  const response = await createProxyResponse(retryResponse);
  setSessionCookies(response, session);
  return response;
}

async function fetchBackendRequest(
  request: Request,
  path: string[],
  accessToken: string | null,
  body: ArrayBuffer | undefined,
): Promise<Response> {
  const backendUrl = new URL(getApiBaseUrl());
  backendUrl.pathname = `${backendUrl.pathname.replace(/\/$/, "")}/${path
    .map(encodeURIComponent)
    .join("/")}`;
  backendUrl.search = new URL(request.url).search;

  const headers: Record<string, string> = {};
  for (const name of ["accept", "content-type", "x-request-id"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (body && body.byteLength > 0 && request.method !== "GET" && request.method !== "HEAD") {
    init.body = body;
  }

  return fetch(backendUrl.toString(), init);
}

async function refreshBackendSession(
  refreshToken: string,
): Promise<BackendAuthSession | null> {
  try {
    const response = await postBackendJson<BackendAuthSession>(
      "/auth/refresh",
      { refreshToken },
    );
    if (!response.ok) return null;

    const body = await readResponseBody(response);
    if (!isBackendAuthSession(body)) return null;
    return body;
  } catch {
    return null;
  }
}

async function readRequestBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  return request.arrayBuffer();
}

async function createProxyResponse(upstreamResponse: Response): Promise<Response> {
  const headers = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstreamResponse.headers.get(name);
    if (value) headers.set(name, value);
  }

  const body = [204, 205, 304].includes(upstreamResponse.status)
    ? null
    : await upstreamResponse.arrayBuffer();
  return new Response(body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
