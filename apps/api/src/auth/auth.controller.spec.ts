import { describe, expect, it } from "vitest";

import { AuthController } from "./auth.controller";
import type { AuthService } from "./auth.service";
import { ROLES_KEY } from "./roles.guard";

const user = {
  id: "usr_customer",
  email: "customer@leopard.demo",
  name: "Demo Customer",
  role: "CUSTOMER" as const
};

describe("AuthController", () => {
  it("delegates login credentials to AuthService", async () => {
    const controller = new AuthController({
      login: async () => ({ accessToken: "token", user })
    } as unknown as AuthService);

    await expect(
      controller.login({
        email: "customer@leopard.demo",
        password: "Password123!"
      })
    ).resolves.toEqual({ accessToken: "token", user });
  });

  it("returns the current user from the authenticated payload subject", async () => {
    const controller = new AuthController({
      getCurrentUser: async () => user
    } as unknown as AuthService);

    await expect(
      controller.me({
        sub: "usr_customer",
        email: "customer@leopard.demo",
        name: "Demo Customer",
        role: "CUSTOMER"
      })
    ).resolves.toEqual(user);
  });

  it("marks /auth/me as available to all MVP roles", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuthController.prototype.me)).toEqual([
      "CUSTOMER",
      "DRIVER",
      "ADMIN"
    ]);
  });
});
