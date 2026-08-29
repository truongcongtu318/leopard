import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-neutral-surface">
      {/* Left — Branding / Visual */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-brand via-teal-700 to-cyan-700">
        {/* Decorative patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -right-32 -bottom-32 h-[480px] w-[480px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative flex w-full flex-col justify-between p-10 xl:p-12 text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <span className="text-lg font-extrabold tracking-tight">LEOPARD</span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-widest backdrop-blur">PILOT</span>
            </div>
          </div>

          <div className="max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur border border-white/15">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Hệ thống đang hoạt động — 6 đơn hàng hôm nay
            </div>
            <h1 className="mt-6 text-4xl xl:text-[42px] font-extrabold leading-[0.95] tracking-tight">
              Vận hành
              <br />
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">logistics</span>
              <br />
              mượt mà hơn.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/80">
              Điều phối đội xe, theo dõi đơn hàng real-time và quản lý tài xế — tất cả trong một bảng điều khiển duy nhất.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { v: "98.4%", l: "Giao đúng hạn" },
                { v: "2.4s", l: "Thời gian phản hồi" },
                { v: "24/7", l: "Giám sát" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-white/10 p-4 backdrop-blur border border-white/10">
                  <div className="text-xl font-bold">{s.v}</div>
                  <div className="text-xs text-white/70">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/60">
            <div className="flex -space-x-2">
              <div className="h-7 w-7 rounded-full bg-white/90 border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-brand">A</div>
              <div className="h-7 w-7 rounded-full bg-teal-900 border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white">F</div>
              <div className="h-7 w-7 rounded-full bg-white border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-brand">D</div>
            </div>
            <span>Tin dùng bởi 12 đội xe tại TP.HCM</span>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gradient-soft via-neutral-surface to-neutral-surface">
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden mb-8 flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <span className="text-lg font-extrabold tracking-tight text-neutral-text">LEOPARD</span>
          </div>

          <div className="rounded-[20px] border border-neutral-border/60 bg-white p-6 sm:p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(0,0,0,0.08)]">
            <div className="mb-6">
              <h2 className="text-[22px] font-bold tracking-tight text-neutral-text">Chào mừng trở lại</h2>
              <p className="mt-1.5 text-sm text-neutral-muted">Đăng nhập để tiếp tục điều phối vận hành</p>
            </div>
            <LoginClientWrapper />
          </div>

          <p className="mt-6 text-center text-xs text-neutral-muted">
            LEOPARD Pilot · Hệ điều phối logistics quy mô nhỏ · Bảo mật cấp doanh nghiệp
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-neutral-muted/70">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Mã hóa end-to-end</span>
            <span className="h-3 w-px bg-neutral-border"/>
            <span>SSO sẵn sàng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
