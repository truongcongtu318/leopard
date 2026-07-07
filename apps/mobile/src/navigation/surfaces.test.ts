import { describe, expect, it } from "vitest";

import { getInitialMobileSurface, mobileSections } from "./surfaces";

describe("mobile foundation surfaces", () => {
  it("separates customer and driver mobile surfaces", () => {
    expect(mobileSections).toEqual([
      {
        role: "CUSTOMER",
        label: "Customer",
        initialSurface: "CustomerHome"
      },
      {
        role: "DRIVER",
        label: "Driver",
        initialSurface: "DriverHome"
      }
    ]);
  });

  it("resolves the initial mobile surface by role", () => {
    expect(getInitialMobileSurface("CUSTOMER")).toBe("CustomerHome");
    expect(getInitialMobileSurface("DRIVER")).toBe("DriverHome");
    expect(getInitialMobileSurface("ADMIN")).toBeNull();
  });
});
