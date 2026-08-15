import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { render, screen } from "@testing-library/react";

import {
  PREVIEW_BANNER_TEXT,
  WEB_PREVIEW_ENABLED_FLAG,
  WebPreviewComposition,
  createWebPreviewSelection,
} from ".";

const originalNodeEnv = process.env.NODE_ENV;
const originalServerFlag = process.env.LEOPARD_UI_PREVIEW;

function setEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

beforeEach(() => {
  setEnvironment("NODE_ENV", "test");
  setEnvironment("LEOPARD_UI_PREVIEW", WEB_PREVIEW_ENABLED_FLAG);
});

afterEach(() => {
  setEnvironment("NODE_ENV", originalNodeEnv);
  setEnvironment("LEOPARD_UI_PREVIEW", originalServerFlag);
});

describe("WebPreviewComposition", () => {
  it("renders an injected smoke fixture with the mandatory preview banner", async () => {
    const selection = await createWebPreviewSelection({
      localFlag: WEB_PREVIEW_ENABLED_FLAG,
      scenarioProvider: async () => ({
        kind: "success",
        data: { orderId: "preview-order-001" },
      }),
    });
    const renderRuntime = jest.fn(() => <p>Dữ liệu runtime</p>);
    const renderFixture = jest.fn((scenario) => (
      <p>{scenario.kind === "success" ? scenario.data.orderId : scenario.copy.title}</p>
    ));

    render(
      <WebPreviewComposition
        selection={selection}
        renderRuntime={renderRuntime}
        renderFixture={renderFixture}
      />,
    );

    expect(screen.getByText(PREVIEW_BANNER_TEXT)).toBeInTheDocument();
    expect(screen.getByText("preview-order-001")).toBeInTheDocument();
    expect(renderFixture).toHaveBeenCalledTimes(1);
    expect(renderRuntime).not.toHaveBeenCalled();
  });

  it("renders only the runtime path when the trusted guard is closed", async () => {
    setEnvironment("NODE_ENV", "production");
    const scenarioProvider = jest.fn(async () => ({
      kind: "success" as const,
      data: { orderId: "must-not-render" },
    }));
    const selection = await createWebPreviewSelection({
      localFlag: WEB_PREVIEW_ENABLED_FLAG,
      scenarioProvider,
    });
    const renderRuntime = jest.fn(() => <p>Dữ liệu runtime</p>);
    const renderFixture = jest.fn(() => <p>Fixture</p>);

    render(
      <WebPreviewComposition
        selection={selection}
        renderRuntime={renderRuntime}
        renderFixture={renderFixture}
      />,
    );

    expect(screen.getByText("Dữ liệu runtime")).toBeInTheDocument();
    expect(screen.queryByText(PREVIEW_BANNER_TEXT)).not.toBeInTheDocument();
    expect(scenarioProvider).not.toHaveBeenCalled();
    expect(renderFixture).not.toHaveBeenCalled();
    expect(renderRuntime).toHaveBeenCalledTimes(1);
  });
});
