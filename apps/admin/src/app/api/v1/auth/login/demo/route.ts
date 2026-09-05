import {
  type BackendAuthResponse,
  clientAuthResponse,
  csrfErrorResponse,
  jsonError,
  jsonResponse,
  postBackendJson,
  readResponseBody,
  setSessionCookies,
} from "../../../../../../lib/auth/bff-session";

const DEMO_ACCOUNTS: Record<
  string,
  {
    readonly role: "ADMIN" | "FLEET_OWNER" | "DRIVER" | "CUSTOMER";
    readonly id: string;
    readonly phone: string;
  }
> = {
  admin: {
    role: "ADMIN",
    id: "usr-admin-1",
    phone: "+840000000004",
  },
  "fleet-owner": {
    role: "FLEET_OWNER",
    id: "usr-fleet-1",
    phone: "+840000000003",
  },
  driver: {
    role: "DRIVER",
    id: "usr-driver-1",
    phone: "+840000000002",
  },
  customer: {
    role: "CUSTOMER",
    id: "usr-customer-1",
    phone: "+840000000001",
  },
  "+840000000004": {
    role: "ADMIN",
    id: "usr-admin-1",
    phone: "+840000000004",
  },
  "+840000000003": {
    role: "FLEET_OWNER",
    id: "usr-fleet-1",
    phone: "+840000000003",
  },
  "+840000000002": {
    role: "DRIVER",
    id: "usr-driver-1",
    phone: "+840000000002",
  },
  "+840000000001": {
    role: "CUSTOMER",
    id: "usr-customer-1",
    phone: "+840000000001",
  },
};

function createOfflineDemoResponse(accountId: string): Response | null {
  const normalizedKey = accountId.toLowerCase().trim();
  const demoAccount = DEMO_ACCOUNTS[normalizedKey];
  if (!demoAccount) return null;

  const accessHandle =
    demoAccount.role === "ADMIN"
      ? "qa-admin"
      : demoAccount.role === "FLEET_OWNER"
        ? "qa-fleet"
        : `qa-${normalizedKey}`;
  const refreshHandle = `refresh-${accessHandle}`;

  const now = Date.now();
  const authBody: BackendAuthResponse = {
    user: {
      id: demoAccount.id,
      phone: demoAccount.phone,
      role: demoAccount.role,
      status: "ACTIVE",
    },
    session: {
      accessToken: accessHandle,
      accessTokenExpiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      refreshToken: refreshHandle,
      refreshTokenExpiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };

  const response = jsonResponse(clientAuthResponse(authBody));
  setSessionCookies(response, authBody.session);
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const csrfError = csrfErrorResponse(request);
  if (csrfError) return csrfError;

  const payload = (await request.json()) as { accountId?: string };
  const accountId = typeof payload?.accountId === "string" ? payload.accountId : "";

  let backendResponse: Response;
  try {
    backendResponse = await postBackendJson<BackendAuthResponse>(
      "/auth/login/demo",
      payload,
    );
  } catch {
    // Upstream backend is unreachable (e.g. offline dev server or UI preview mode)
    const fallbackResponse = createOfflineDemoResponse(accountId);
    if (fallbackResponse) return fallbackResponse;

    return jsonError(503, {
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "Hệ thống xác thực backend hiện không khả dụng",
    });
  }

  const body = await readResponseBody(backendResponse);

  if (!backendResponse.ok) {
    return jsonError(backendResponse.status, body);
  }

  const authBody = body as BackendAuthResponse;
  const response = jsonResponse(clientAuthResponse(authBody));
  setSessionCookies(response, authBody.session);
  return response;
}
