import { describe, expect, it } from "vitest";

import { AuthService } from "./auth.service";
import { hashPassword } from "./password.service";
import type { AuthUserRecord, AuthUserRepository } from "./auth-user.repository";
import type { TokenService } from "./token.service";

const customer: AuthUserRecord = {
  id: "usr_customer",
  email: "customer@leopard.demo",
  name: "Demo Customer",
  role: "CUSTOMER",
  passwordHash: hashPassword("Password123!", "leopard-demo-v1")
};

class FakeUserRepository implements AuthUserRepository {
  constructor(private readonly users: AuthUserRecord[]) {}

  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }
}

class FakeTokenService implements TokenService {
  async sign(user: AuthUserRecord) {
    return `token-for-${user.id}`;
  }

  async verify(token: string) {
    return {
      sub: token.replace("token-for-", ""),
      email: customer.email,
      name: customer.name,
      role: customer.role
    };
  }
}

describe("AuthService", () => {
  it("returns an access token and user profile for valid credentials", async () => {
    const service = new AuthService(
      new FakeUserRepository([customer]),
      new FakeTokenService()
    );

    await expect(
      service.login({
        email: "customer@leopard.demo",
        password: "Password123!"
      })
    ).resolves.toEqual({
      accessToken: "token-for-usr_customer",
      user: {
        id: "usr_customer",
        email: "customer@leopard.demo",
        name: "Demo Customer",
        role: "CUSTOMER"
      }
    });
  });

  it("rejects invalid passwords with AUTH_INVALID_CREDENTIALS", async () => {
    const service = new AuthService(
      new FakeUserRepository([customer]),
      new FakeTokenService()
    );

    await expect(
      service.login({
        email: "customer@leopard.demo",
        password: "bad-password"
      })
    ).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Email or password is invalid.",
        details: {}
      }
    });
  });

  it("rejects missing users with AUTH_INVALID_CREDENTIALS", async () => {
    const service = new AuthService(
      new FakeUserRepository([]),
      new FakeTokenService()
    );

    await expect(
      service.login({
        email: "missing@leopard.demo",
        password: "Password123!"
      })
    ).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS"
      }
    });
  });

  it("rejects malformed credentials with AUTH_INVALID_CREDENTIALS", async () => {
    const service = new AuthService(
      new FakeUserRepository([customer]),
      new FakeTokenService()
    );

    await expect(
      service.login({
        email: "customer@leopard.demo",
        password: undefined as unknown as string
      })
    ).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS"
      }
    });
  });

  it("rejects null credentials with AUTH_INVALID_CREDENTIALS", async () => {
    const service = new AuthService(
      new FakeUserRepository([customer]),
      new FakeTokenService()
    );

    await expect(
      service.login(null as unknown as Parameters<AuthService["login"]>[0])
    ).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS"
      }
    });
  });

  it("returns current user by authenticated user id", async () => {
    const service = new AuthService(
      new FakeUserRepository([customer]),
      new FakeTokenService()
    );

    await expect(service.getCurrentUser("usr_customer")).resolves.toEqual({
      id: "usr_customer",
      email: "customer@leopard.demo",
      name: "Demo Customer",
      role: "CUSTOMER"
    });
  });

  it("rejects unknown authenticated subjects with AUTH_TOKEN_REQUIRED", async () => {
    const service = new AuthService(
      new FakeUserRepository([]),
      new FakeTokenService()
    );

    await expect(service.getCurrentUser("usr_missing")).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: "AUTH_TOKEN_REQUIRED"
      }
    });
  });
});
