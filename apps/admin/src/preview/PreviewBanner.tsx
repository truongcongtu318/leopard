export const PREVIEW_BANNER_TEXT =
  "Bản xem trước giao diện — dữ liệu mô phỏng";

export function PreviewBanner() {
  return (
    <aside
      aria-label="Chế độ xem trước giao diện"
      className="rounded-control border border-warning-border bg-warning px-md py-sm text-sm text-warning-text"
    >
      <p
        aria-atomic="true"
        aria-live="polite"
        className="m-0 font-medium"
        role="status"
      >
        {PREVIEW_BANNER_TEXT}
      </p>
    </aside>
  );
}
