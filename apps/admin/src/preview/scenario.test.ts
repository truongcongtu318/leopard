import { describe, expect, it } from "@jest/globals";

import * as previewBoundary from ".";
import {
  WEB_PREVIEW_ENABLED_FLAG,
  WEB_UI_SCENARIO_NAMES,
  createWebPreviewSelection,
  type PreviewFixtureValue,
  type WebPreviewScenarioRequest,
  type WebUiScenarioName,
} from ".";

const ENABLED_PREVIEW = {
  nodeEnv: "test",
  serverFlag: WEB_PREVIEW_ENABLED_FLAG,
  localFlag: WEB_PREVIEW_ENABLED_FLAG,
} as const;

function selectFixtureScenario<TData extends PreviewFixtureValue>(
  scenario: WebPreviewScenarioRequest<TData>,
) {
  const selection = createWebPreviewSelection({
    ...ENABLED_PREVIEW,
    scenario,
  });

  expect(selection.enabled).toBe(true);
  expect(selection.bannerRequired).toBe(true);

  if (!selection.enabled) {
    throw new Error("Expected a guarded fixture selection in test mode.");
  }

  return selection.scenario;
}

describe("web UI scenario vocabulary", () => {
  it("defines the complete canonical state vocabulary", () => {
    const exhaustiveVocabulary: Record<WebUiScenarioName, true> = {
      loading: true,
      empty: true,
      error: true,
      success: true,
      "permission-denied": true,
    };

    expect(WEB_UI_SCENARIO_NAMES).toEqual(Object.keys(exhaustiveVocabulary));
  });

  it.each([
    "loading",
    "empty",
    "error",
    "permission-denied",
  ] as const)("returns a fresh deterministic %s scenario", (scenarioName) => {
    const first = selectFixtureScenario({ kind: scenarioName });
    const second = selectFixtureScenario({ kind: scenarioName });

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.copy).not.toBe(second.copy);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.copy)).toBe(true);
  });

  it("uses stable public error codes without exposing error details", () => {
    expect(selectFixtureScenario({ kind: "error" })).toMatchObject({
      kind: "error",
      errorCode: "SERVICE_NOT_READY",
    });
    expect(selectFixtureScenario({ kind: "permission-denied" })).toMatchObject({
      kind: "permission-denied",
      errorCode: "FORBIDDEN",
    });
    expect(selectFixtureScenario({ kind: "error" })).not.toHaveProperty("details");
  });

  it("does not expose raw fixture factories from the preview boundary", () => {
    expect(previewBoundary).not.toHaveProperty("createImmutableFixture");
    expect(previewBoundary).not.toHaveProperty("createWebUiScenario");
  });
});

describe("guarded immutable preview fixtures", () => {
  const sourceFixture = {
    order: {
      id: "preview-order-001",
      status: "REQUESTED",
    },
    checkpoints: ["Quận 1", "Thành phố Thủ Đức"],
  } as const;

  it("deep-clones and freezes fixture values", () => {
    const scenario = selectFixtureScenario({
      kind: "success",
      data: sourceFixture,
    });

    if (scenario.kind !== "success") {
      throw new Error("Expected a success fixture scenario.");
    }

    expect(scenario.data).toEqual(sourceFixture);
    expect(scenario.data).not.toBe(sourceFixture);
    expect(scenario.data.order).not.toBe(sourceFixture.order);
    expect(scenario.data.checkpoints).not.toBe(sourceFixture.checkpoints);
    expect(Object.isFrozen(scenario)).toBe(true);
    expect(Object.isFrozen(scenario.data)).toBe(true);
    expect(Object.isFrozen(scenario.data.order)).toBe(true);
    expect(Object.isFrozen(scenario.data.checkpoints)).toBe(true);
  });

  it("returns fresh nested values for every guarded selection", () => {
    const request = { kind: "success", data: sourceFixture } as const;
    const first = selectFixtureScenario(request);
    const second = selectFixtureScenario(request);

    if (first.kind !== "success" || second.kind !== "success") {
      throw new Error("Expected success fixture scenarios.");
    }

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.data).not.toBe(second.data);
    expect(first.data.order).not.toBe(second.data.order);
    expect(first.data.checkpoints).not.toBe(second.data.checkpoints);
  });

  it("does not mutate the source fixture", () => {
    const before = JSON.stringify(sourceFixture);

    selectFixtureScenario({ kind: "success", data: sourceFixture });

    expect(JSON.stringify(sourceFixture)).toBe(before);
    expect(Object.isFrozen(sourceFixture)).toBe(false);
  });

  it.each(["production", "staging", undefined])(
    "never exposes a fixture scenario when environment is %s",
    (nodeEnv) => {
      const selection = createWebPreviewSelection({
        nodeEnv,
        serverFlag: WEB_PREVIEW_ENABLED_FLAG,
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: { kind: "success", data: sourceFixture },
      });

      expect(selection).toMatchObject({
        enabled: false,
        source: "runtime",
        scenario: null,
        bannerRequired: false,
      });
      expect(Object.isFrozen(selection)).toBe(true);
    },
  );
});
