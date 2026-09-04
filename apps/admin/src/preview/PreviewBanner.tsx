export const PREVIEW_BANNER_TEXT =
  "Bản xem trước giao diện — dữ liệu mô phỏng";

export function PreviewBanner() {
  return (
    <aside
      aria-label="Chế độ xem trước giao diện"
      className="inline-flex items-center gap-2 self-start rounded-full border border-amber-200/80 bg-amber-50/90 backdrop-blur-xs px-3 py-1 text-xs text-amber-800 shadow-2xs mb-1"
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
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
