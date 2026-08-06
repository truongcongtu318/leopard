import { clearRefreshCookie } from "../../../../../lib/auth/bff-session";

export async function POST(): Promise<Response> {
  const response = new Response(null, { status: 204 });
  clearRefreshCookie(response);
  return response;
}
