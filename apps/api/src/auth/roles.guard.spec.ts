import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { ROLES_KEY, RolesGuard } from "./roles.guard";

function createContext(role?: string): ExecutionContext {
  return {
    getHandler: () => "handler",
    getClass: () => "controller",
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { role } : undefined
      })
    })
  } as unknown as ExecutionContext;
}

function createReflector(roles: string[]): Reflector {
  return {
    getAllAndOverride: (key: string) => (key === ROLES_KEY ? roles : undefined)
  } as unknown as Reflector;
}

describe("RolesGuard", () => {
  it("allows a user with an accepted role", () => {
    const guard = new RolesGuard(createReflector(["ADMIN"]));

    expect(guard.canActivate(createContext("ADMIN"))).toBe(true);
  });

  it("denies authenticated users with the wrong role", () => {
    const guard = new RolesGuard(createReflector(["ADMIN"]));

    expect(() => guard.canActivate(createContext("CUSTOMER"))).toThrowError(
      expect.objectContaining({
        response: expect.objectContaining({
          statusCode: 403,
          code: "AUTH_FORBIDDEN_ROLE"
        })
      }) as ForbiddenException
    );
  });

  it("rejects routes with role metadata when no user role is present", () => {
    const guard = new RolesGuard(createReflector(["ADMIN"]));

    expect(() => guard.canActivate(createContext())).toThrowError(
      expect.objectContaining({
        response: expect.objectContaining({
          statusCode: 401,
          code: "AUTH_TOKEN_REQUIRED"
        })
      }) as UnauthorizedException
    );
  });

  it("allows routes without role metadata", () => {
    const guard = new RolesGuard(createReflector([]));

    expect(guard.canActivate(createContext("CUSTOMER"))).toBe(true);
  });
});
