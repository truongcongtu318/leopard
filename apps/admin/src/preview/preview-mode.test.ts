import { describe, expect, it } from "@jest/globals";

import {
  WEB_PREVIEW_ENABLED_FLAG,
  resolveWebPreviewMode,
} from "./preview-mode";

describe("resolveWebPreviewMode", () => {
  it.each(["development", "test"] as const)(
    "enables fixtures in %s only after server and local opt in",
    (nodeEnv) => {
      expect(
        resolveWebPreviewMode({
          nodeEnv,
          serverFlag: WEB_PREVIEW_ENABLED_FLAG,
          localFlag: WEB_PREVIEW_ENABLED_FLAG,
        }),
      ).toEqual({
        enabled: true,
        source: "fixtures",
        bannerRequired: true,
      });
    },
  );

  it("fails closed in production even when both flags request fixtures", () => {
    expect(
      resolveWebPreviewMode({
        nodeEnv: "production",
        serverFlag: WEB_PREVIEW_ENABLED_FLAG,
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
      }),
    ).toEqual({
      enabled: false,
      source: "runtime",
      reason: "production",
    });
  });

  it("fails closed when the environment is missing or unsupported", () => {
    expect(
      resolveWebPreviewMode({
        nodeEnv: undefined,
        serverFlag: WEB_PREVIEW_ENABLED_FLAG,
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
      }),
    ).toMatchObject({ enabled: false, reason: "unsupported-environment" });

    expect(
      resolveWebPreviewMode({
        nodeEnv: "staging",
        serverFlag: WEB_PREVIEW_ENABLED_FLAG,
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
      }),
    ).toMatchObject({ enabled: false, reason: "unsupported-environment" });
  });

  it("requires an explicit server opt in", () => {
    expect(
      resolveWebPreviewMode({
        nodeEnv: "development",
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
      }),
    ).toMatchObject({ enabled: false, reason: "server-flag-disabled" });
  });

  it("requires an explicit local opt in", () => {
    expect(
      resolveWebPreviewMode({
        nodeEnv: "development",
        serverFlag: WEB_PREVIEW_ENABLED_FLAG,
      }),
    ).toMatchObject({ enabled: false, reason: "local-flag-disabled" });
  });

  it("does not treat truthy-looking strings as an enabled flag", () => {
    expect(
      resolveWebPreviewMode({
        nodeEnv: "development",
        serverFlag: "true",
        localFlag: "1",
      }),
    ).toMatchObject({ enabled: false, reason: "server-flag-disabled" });
  });
});
