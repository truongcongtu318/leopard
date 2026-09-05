export const PREVIEW_BANNER_TEXT =
  "Bản xem trước giao diện — dữ liệu mô phỏng";

export function PreviewBanner() {
  return (
    <aside
      aria-label="Chế độ xem trước giao diện"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-amber-200/90 bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs text-amber-800 shadow-md transition-all hover:shadow-lg"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
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
