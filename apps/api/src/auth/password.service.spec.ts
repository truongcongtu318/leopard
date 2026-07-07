import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password.service";

describe("password helpers", () => {
  it("verifies a scrypt password hash", () => {
    const hash = hashPassword("Password123!", "leopard-demo-v1");

    expect(verifyPassword("Password123!", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed password hashes", () => {
    expect(verifyPassword("Password123!", "not-a-valid-hash")).toBe(false);
  });
});
