import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

import { ScreenState, type ScreenStateProps } from "./ScreenState";

const defaultCopyCases: ReadonlyArray<
  readonly [ScreenStateProps["state"], string, string]
> = [
  ["loading", "Đang tải dữ liệu", "Vui lòng chờ trong giây lát."],
  ["empty", "Chưa có dữ liệu", "Chưa có nội dung phù hợp để hiển thị."],
  [
    "no-results",
    "Không tìm thấy kết quả",
    "Không có dữ liệu phù hợp với bộ lọc hiện tại.",
  ],
  ["error", "Không thể tải dữ liệu", "Vui lòng thử lại khi kết nối ổn định."],
  ["success", "Đã cập nhật dữ liệu", "Thông tin mới nhất đã được ghi nhận."],
  [
    "permission-denied",
    "Bạn không có quyền truy cập",
    "Hãy quay về khu vực được cấp quyền.",
  ],
  [
    "offline",
    "Đang ngoại tuyến",
    "Nội dung hiện có có thể chưa phải dữ liệu mới nhất.",
  ],
  [
    "stale",
    "Dữ liệu có thể đã cũ",
    "Nội dung này là lần cập nhật gần nhất đã nhận được.",
  ],
  [
    "reconnecting",
    "Đang kết nối lại",
    "Nội dung hiện có vẫn được giữ trong khi khôi phục kết nối.",
  ],
  [
    "session-expired",
    "Phiên làm việc đã hết hạn",
    "Vui lòng đăng nhập lại để tiếp tục.",
  ],
  [
    "conflict",
    "Dữ liệu đã thay đổi",
    "Hãy tải lại dữ liệu mới nhất trước khi tiếp tục.",
  ],
];

describe("ScreenState state contract", () => {
  it.each(defaultCopyCases)(
    "renders understandable Vietnamese copy for %s",
    (state, title, message) => {
      render(<ScreenState state={state} />);

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();
    },
  );

  it("keeps the existing message override contract", () => {
    render(<ScreenState state="error" message="Không tải được mã đơn LP-1024." />);

    expect(screen.getByText("Không tải được mã đơn LP-1024.")).toBeInTheDocument();
    expect(
      screen.queryByText("Vui lòng thử lại khi kết nối ổn định."),
    ).not.toBeInTheDocument();
  });

  it("keeps success children and announces persisted success feedback", () => {
    render(
      <ScreenState state="success">
        <div>Chi tiết đơn đã lưu</div>
      </ScreenState>,
    );

    expect(screen.getByText("Chi tiết đơn đã lưu")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("never renders private children for permission denial", () => {
    render(
      <ScreenState state="permission-denied">
        <div>Mã đơn riêng tư LP-0001</div>
      </ScreenState>,
    );

    expect(screen.queryByText("Mã đơn riêng tư LP-0001")).not.toBeInTheDocument();
  });

  it.each(["offline", "stale", "reconnecting"] as const)(
    "keeps existing context and exposes a polite live region for %s",
    (state) => {
      render(
        <ScreenState state={state}>
          <div>Ngữ cảnh đơn đang xem</div>
        </ScreenState>,
      );

      expect(screen.getByText("Ngữ cảnh đơn đang xem")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
      expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
    },
  );

  it.each(["error", "permission-denied", "session-expired", "conflict"] as const)(
    "announces the blocking %s state as an assertive alert",
    (state) => {
      render(<ScreenState state={state} />);

      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    },
  );

  it.each(["loading", "reconnecting"] as const)(
    "marks %s feedback as busy without making the indicator another live region",
    (state) => {
      const { container } = render(<ScreenState state={state} />);

      expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
      expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    },
  );

  it("moves focus to the permission-denied heading without exposing children", () => {
    render(<ScreenState state="permission-denied" />);

    const heading = screen.getByRole("heading", {
      name: "Bạn không có quyền truy cập",
    });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveFocus();
  });

  it("keeps onRetry as an accessible native button callback", () => {
    const onRetry = jest.fn();
    render(<ScreenState state="error" onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton.tagName).toBe("BUTTON");
    expect(retryButton).toHaveAttribute("type", "button");
    retryButton.focus();
    expect(retryButton).toHaveFocus();
    expect(retryButton.className).toContain("focus-visible:ring-2");

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("supports a named action without overloading retry semantics", () => {
    const onAction = jest.fn();
    render(
      <ScreenState
        state="no-results"
        actionLabel="Xóa bộ lọc"
        onAction={onAction}
      />,
    );

    const actionButton = screen.getByRole("button", { name: "Xóa bộ lọc" });
    expect(actionButton.tagName).toBe("BUTTON");
    expect(actionButton).toHaveAttribute("type", "button");

    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("stops repeated spinner motion when reduced motion is requested", () => {
    const { container } = render(<ScreenState state="loading" />);

    const spinner = container.querySelector('svg[aria-hidden="true"]');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin", "motion-reduce:animate-none");
  });
});
