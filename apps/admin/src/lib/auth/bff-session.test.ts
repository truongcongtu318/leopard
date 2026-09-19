import { isSameOriginRequest } from "./bff-session";

function proxiedRequest(headers: Record<string, string>): Request {
  return {
    // Next.js derives this from the hostname the server started with, so behind
    // a reverse proxy it is the internal container name — never the public host.
    url: "http://admin:3002/api/v1/auth/login/demo",
    method: "POST",
    headers: new Headers(headers),
  } as unknown as Request;
}

describe("isSameOriginRequest behind a reverse proxy", () => {
  const publicOrigin = "https://demo.example.com";

  it("accepts the public origin forwarded by the proxy", () => {
    const request = proxiedRequest({
      origin: publicOrigin,
      "x-forwarded-host": "demo.example.com",
      "x-forwarded-proto": "https",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts the forwarded host when only Host is forwarded", () => {
    const request = proxiedRequest({
      origin: publicOrigin,
      host: "demo.example.com",
      "x-forwarded-proto": "https",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts the public origin carried by the referer", () => {
    const request = proxiedRequest({
      referer: `${publicOrigin}/login`,
      "x-forwarded-host": "demo.example.com",
      "x-forwarded-proto": "https",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("still rejects a cross-site origin", () => {
    const request = proxiedRequest({
      origin: "https://evil.example",
      "x-forwarded-host": "demo.example.com",
      "x-forwarded-proto": "https",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects an origin that matches neither the url nor the forwarded host", () => {
    const request = proxiedRequest({
      origin: "http://admin:3002.evil.example",
      "x-forwarded-host": "demo.example.com",
      "x-forwarded-proto": "https",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("accepts HTTPS origin when edge proxy forwarded x-forwarded-proto as http", () => {
    const request = proxiedRequest({
      origin: "https://demo.example.com",
      "x-forwarded-host": "demo.example.com",
      "x-forwarded-proto": "http",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts trycloudflare.com tunnel origins", () => {
    const request = proxiedRequest({
      origin: "https://letter-accurately-paragraphs-patches.trycloudflare.com",
      host: "localhost:8888",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("keeps a request whose origin matches the internal url", () => {
    const request = proxiedRequest({ origin: "http://admin:3002" });

    expect(isSameOriginRequest(request)).toBe(true);
  });
});
