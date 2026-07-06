import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns service status and shared roles", () => {
    const response = new HealthController().check();

    expect(response.status).toBe("ok");
    expect(response.service).toBe("leopard-api");
    expect(response.roles).toEqual(["CUSTOMER", "DRIVER", "ADMIN"]);
  });
});
