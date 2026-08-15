import { describe, expect, it } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";

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
});
