import { describe, expect, it } from "vitest";

import { createApiClient } from "./api";

describe("mobile API client placeholder", () => {
  it("keeps a normalized base URL for later auth/order calls", () => {
    expect(createApiClient("http://localhost:4000/").baseUrl).toBe(
      "http://localhost:4000"
    );
  });
});
