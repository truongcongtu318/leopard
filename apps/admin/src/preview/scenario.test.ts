import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import * as previewBoundary from ".";
import {
  WEB_PREVIEW_ENABLED_FLAG,
  WEB_UI_SCENARIO_NAMES,
  createWebPreviewSelection,
  type PreviewFixtureValue,
  type WebPreviewScenarioRequest,
  type WebUiScenarioName,
} from ".";

const SERVER_FLAG_ENV = "LEOPARD_UI_PREVIEW";
const originalNodeEnv = process.env.NODE_ENV;
const originalServerFlag = process.env[SERVER_FLAG_ENV];

function setEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

beforeEach(() => {
  setEnvironment("NODE_ENV", "test");
  setEnvironment(SERVER_FLAG_ENV, WEB_PREVIEW_ENABLED_FLAG);
});

afterEach(() => {
  setEnvironment("NODE_ENV", originalNodeEnv);
  setEnvironment(SERVER_FLAG_ENV, originalServerFlag);
});

async function selectFixtureScenario<TData extends PreviewFixtureValue>(
  scenario: WebPreviewScenarioRequest<TData>,
) {
  const scenarioProvider = jest.fn(async () => scenario);
  const selection = await createWebPreviewSelection({
    localFlag: WEB_PREVIEW_ENABLED_FLAG,
    scenarioProvider,
  });

  expect(scenarioProvider).toHaveBeenCalledTimes(1);
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
  ] as const)("returns a fresh deterministic %s scenario", async (scenarioName) => {
    const first = await selectFixtureScenario({ kind: scenarioName });
    const second = await selectFixtureScenario({ kind: scenarioName });

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.copy).not.toBe(second.copy);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.copy)).toBe(true);
  });

  it("uses stable public error codes without exposing error details", async () => {
    await expect(selectFixtureScenario({ kind: "error" })).resolves.toMatchObject({
      kind: "error",
      errorCode: "SERVICE_NOT_READY",
    });
    await expect(
      selectFixtureScenario({ kind: "permission-denied" }),
    ).resolves.toMatchObject({
      kind: "permission-denied",
      errorCode: "FORBIDDEN",
    });
    await expect(selectFixtureScenario({ kind: "error" })).resolves.not.toHaveProperty(
      "details",
    );
  });

  it("does not expose raw fixture factories from the preview boundary", () => {
    expect(previewBoundary).not.toHaveProperty("createImmutableFixture");
    expect(previewBoundary).not.toHaveProperty("createWebUiScenario");
    expect(previewBoundary).not.toHaveProperty("resolveWebPreviewMode");
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

  it("deep-clones and freezes fixture values", async () => {
    const scenario = await selectFixtureScenario({
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

  it("returns fresh nested values for every guarded selection", async () => {
    const request = { kind: "success", data: sourceFixture } as const;
    const first = await selectFixtureScenario(request);
    const second = await selectFixtureScenario(request);

    if (first.kind !== "success" || second.kind !== "success") {
      throw new Error("Expected success fixture scenarios.");
    }

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.data).not.toBe(second.data);
    expect(first.data.order).not.toBe(second.data.order);
    expect(first.data.checkpoints).not.toBe(second.data.checkpoints);
  });

  it("does not mutate the source fixture", async () => {
    const before = JSON.stringify(sourceFixture);

    await selectFixtureScenario({ kind: "success", data: sourceFixture });

    expect(JSON.stringify(sourceFixture)).toBe(before);
    expect(Object.isFrozen(sourceFixture)).toBe(false);
  });

  it.each(["production", "staging", undefined])(
    "never invokes the lazy fixture provider when trusted environment is %s",
    async (nodeEnv) => {
      setEnvironment("NODE_ENV", nodeEnv);
      const scenarioProvider = jest.fn(async () => ({
        kind: "success" as const,
        data: sourceFixture,
      }));

      const selection = await createWebPreviewSelection({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenarioProvider,
      });

      expect(selection).toMatchObject({
        enabled: false,
        source: "runtime",
        scenario: null,
        bannerRequired: false,
      });
      expect(scenarioProvider).not.toHaveBeenCalled();
      expect(Object.isFrozen(selection)).toBe(true);
    },
  );

  it("never invokes the lazy fixture provider without trusted server opt in", async () => {
    setEnvironment(SERVER_FLAG_ENV, undefined);
    const scenarioProvider = jest.fn(async () => ({
      kind: "success" as const,
      data: sourceFixture,
    }));

    const selection = await createWebPreviewSelection({
      localFlag: WEB_PREVIEW_ENABLED_FLAG,
      scenarioProvider,
    });

    expect(selection).toMatchObject({
      enabled: false,
      reason: "server-flag-disabled",
      scenario: null,
      bannerRequired: false,
    });
    expect(scenarioProvider).not.toHaveBeenCalled();
  });
});
