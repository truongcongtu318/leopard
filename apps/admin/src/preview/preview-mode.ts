export const WEB_PREVIEW_ENABLED_FLAG = "enabled" as const;

export interface ResolveWebPreviewModeInput {
  readonly nodeEnv: string | undefined;
  readonly serverFlag?: string | null;
  readonly localFlag?: string | null;
}

export type DisabledWebPreviewReason =
  | "production"
  | "unsupported-environment"
  | "server-flag-disabled"
  | "local-flag-disabled";

export type WebPreviewModeResolution =
  | {
      readonly enabled: true;
      readonly source: "fixtures";
      readonly bannerRequired: true;
    }
  | {
      readonly enabled: false;
      readonly source: "runtime";
      readonly reason: DisabledWebPreviewReason;
    };

function disabled(reason: DisabledWebPreviewReason): WebPreviewModeResolution {
  return Object.freeze({
    enabled: false,
    source: "runtime",
    reason,
  });
}

export function resolveWebPreviewMode({
  nodeEnv,
  serverFlag,
  localFlag,
}: ResolveWebPreviewModeInput): WebPreviewModeResolution {
  if (nodeEnv === "production") {
    return disabled("production");
  }

  if (nodeEnv !== "development" && nodeEnv !== "test") {
    return disabled("unsupported-environment");
  }

  if (serverFlag !== WEB_PREVIEW_ENABLED_FLAG) {
    return disabled("server-flag-disabled");
  }

  if (localFlag !== WEB_PREVIEW_ENABLED_FLAG) {
    return disabled("local-flag-disabled");
  }

  return Object.freeze({
    enabled: true,
    source: "fixtures",
    bannerRequired: true,
  });
}
