import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { JwtAuthGuard } from "./jwt-auth.guard";
import type { JwtPayload, TokenService } from "./token.service";

function createContext(authorization?: string) {
  const request: { headers: { authorization?: string }; user?: JwtPayload } = {
    headers: { authorization }
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;

  return { context, request };
}

class FakeTokenService implements TokenService {
  async sign() {
    return "token";
  }

  async verify() {
    return {
      sub: "usr_customer",
      email: "customer@leopard.demo",
      name: "Demo Customer",
      role: "CUSTOMER"
    } satisfies JwtPayload;
  }
}

describe("JwtAuthGuard", () => {
  it("attaches the verified bearer payload to request.user", async () => {
    const { context, request } = createContext("Bearer valid-token");
    const guard = new JwtAuthGuard(new FakeTokenService());

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      sub: "usr_customer",
      role: "CUSTOMER"
    });
  });

  it("rejects missing bearer tokens", async () => {
    const { context } = createContext();
    const guard = new JwtAuthGuard(new FakeTokenService());

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: "AUTH_TOKEN_REQUIRED"
      }
    });
  });
});
