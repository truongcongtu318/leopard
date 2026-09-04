import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#d6e8fb] via-[#fbf6de] to-[#fef3ca] px-4 py-10 overflow-hidden text-neutral-text">
      {/* Decorative ambient blurred shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl motion-reduce:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl motion-reduce:hidden"
      />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="rounded-[28px] sm:rounded-[32px] border border-white/80 bg-white/95 backdrop-blur-md p-8 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-2xs mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            404 · Không tìm thấy trang
          </span>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-neutral-text">
            Trang không tồn tại
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-muted leading-relaxed">
            Địa chỉ bạn đang truy cập có thể đã được thay đổi hoặc không thuộc phạm vi điều phối của hệ thống LEOPARD.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/admin"
              className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Về bàn điều phối
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl border border-slate-200/80 bg-white px-5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Trang đăng nhập
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-neutral-muted">
          LEOPARD Operations · Pilot Platform
        </p>
      </div>
    </div>
  );
}
