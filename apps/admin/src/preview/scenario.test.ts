import { describe, expect, it } from "@jest/globals";

import {
  WEB_UI_SCENARIO_NAMES,
  createImmutableFixture,
  createWebUiScenario,
  type WebUiScenarioName,
} from "./scenario";

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
    const first = createWebUiScenario(scenarioName);
    const second = createWebUiScenario(scenarioName);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.copy).not.toBe(second.copy);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.copy)).toBe(true);
  });

  it("uses stable public error codes without exposing error details", () => {
    expect(createWebUiScenario("error")).toMatchObject({
      kind: "error",
      errorCode: "SERVICE_NOT_READY",
    });
    expect(createWebUiScenario("permission-denied")).toMatchObject({
      kind: "permission-denied",
      errorCode: "FORBIDDEN",
    });
    expect(createWebUiScenario("error")).not.toHaveProperty("details");
  });
});

describe("immutable preview fixtures", () => {
  const sourceFixture = {
    order: {
      id: "preview-order-001",
      status: "REQUESTED",
    },
    checkpoints: ["Quận 1", "Thành phố Thủ Đức"],
  } as const;

  it("deep-clones and freezes fixture values", () => {
    const fixture = createImmutableFixture(sourceFixture);

    expect(fixture).toEqual(sourceFixture);
    expect(fixture).not.toBe(sourceFixture);
    expect(fixture.order).not.toBe(sourceFixture.order);
    expect(fixture.checkpoints).not.toBe(sourceFixture.checkpoints);
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.order)).toBe(true);
    expect(Object.isFrozen(fixture.checkpoints)).toBe(true);
  });

  it("returns fresh nested values for every scenario factory call", () => {
    const first = createWebUiScenario("success", sourceFixture);
    const second = createWebUiScenario("success", sourceFixture);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.data).not.toBe(second.data);
    expect(first.data.order).not.toBe(second.data.order);
    expect(first.data.checkpoints).not.toBe(second.data.checkpoints);
    expect(Object.isFrozen(first.data)).toBe(true);
  });

  it("does not mutate the source fixture", () => {
    const before = JSON.stringify(sourceFixture);

    createWebUiScenario("success", sourceFixture);

    expect(JSON.stringify(sourceFixture)).toBe(before);
    expect(Object.isFrozen(sourceFixture)).toBe(false);
  });
});
