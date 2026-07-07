import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const React = await import("react");
  const component =
    (tag: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(tag, null, children);

  const StatusBar = Object.assign(component("status-bar"), {
    currentHeight: 24
  });

  return {
    ScrollView: component("scroll-view"),
    StatusBar,
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: component("text"),
    View: component("view")
  };
});

vi.mock("react-native-safe-area-context", async () => {
  const React = await import("react");
  const component =
    (tag: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(tag, null, children);

  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(
        "safe-area-provider",
        { "data-provider": "safe-area" },
        children
      ),
    SafeAreaView: component("safe-area-view")
  };
});

import { AppRoot } from "./AppRoot";

describe("AppRoot", () => {
  it("renders the mobile foundation shell", () => {
    const markup = renderToStaticMarkup(<AppRoot />);

    expect(markup).toContain("LEOPARD Mobile");
    expect(markup).toContain('data-provider="safe-area"');
    expect(markup).toContain("Auth placeholder");
    expect(markup).toContain("Customer placeholder");
    expect(markup).toContain("Driver placeholder");
  });
});
