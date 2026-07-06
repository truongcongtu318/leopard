import { describe, expect, it } from "vitest";

import { orderStatuses, roles } from "@leopard/shared";

describe("web foundation contracts", () => {
  it("can consume shared roles and order statuses", () => {
    expect(roles).toContain("ADMIN");
    expect(orderStatuses).toContain("DELIVERED");
  });
});
