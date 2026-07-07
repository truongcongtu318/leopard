import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const React = await import("react");
  const component =
    (tag: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(tag, null, children);

  return {
    ScrollView: component("scroll-view"),
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: component("text"),
    View: component("view")
  };
});

vi.mock("react-native-safe-area-context", async () => {
  const React = await import("react");

  return {
    SafeAreaView: ({
      children,
      edges
    }: {
      children?: React.ReactNode;
      edges?: string[];
    }) =>
      React.createElement(
        "safe-area-view",
        { "data-edges": edges?.join(",") },
        children
      )
  };
});

import { MobileShell } from "./MobileShell";

describe("MobileShell", () => {
  it("renders the mobile app shell content", () => {
    const markup = renderToStaticMarkup(
      <MobileShell
        eyebrow="LEOPARD Mobile"
        title="Foundation"
        subtitle="Customer and Driver shell"
      >
        <span>placeholder child</span>
      </MobileShell>
    );

    expect(markup).toContain("LEOPARD Mobile");
    expect(markup).toContain("Foundation");
    expect(markup).toContain("placeholder child");
    expect(markup).toContain('data-edges="top,right,bottom,left"');
  });
});
