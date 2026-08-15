import { describe, expect, it } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PREVIEW_BANNER_TEXT, PreviewBanner } from "./PreviewBanner";

describe("PreviewBanner", () => {
  it("identifies the preview context with the required Vietnamese copy", () => {
    render(<PreviewBanner />);

    const banner = screen.getByRole("complementary", {
      name: "Chế độ xem trước giao diện",
    });

    expect(within(banner).getByText(PREVIEW_BANNER_TEXT).textContent).toBe(
      "Bản xem trước giao diện — dữ liệu mô phỏng",
    );
  });

  it("announces the non-production data notice politely and atomically", () => {
    render(<PreviewBanner />);

    const status = screen.getByRole("status");

    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-atomic")).toBe("true");
    expect(status.textContent).toBe(PREVIEW_BANNER_TEXT);
  });

  it("loads the shared semantic theme through the app CSS entrypoint", () => {
    const globalStyles = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    const sharedTheme = readFileSync(
      resolve(process.cwd(), "../../packages/ui/src/tokens.css"),
      "utf8",
    );

    expect(globalStyles).toContain('@import "tailwindcss";');
    expect(globalStyles).toContain(
      '@import "../../../../packages/ui/src/tokens.css";',
    );
    expect(sharedTheme).not.toContain('@import "tailwindcss";');
    expect(sharedTheme).toContain("--color-warning:");
    expect(sharedTheme).toContain("--radius-control:");
  });
});
