import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAFC] px-4 py-10 overflow-x-hidden antialiased selection:bg-slate-900 selection:text-white">
      {/* NexaFleet Ambient Lighting & Dot Matrix Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-sky-500/10 blur-[100px] motion-reduce:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-amber-500/10 blur-[100px] motion-reduce:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[28rem] w-[28rem] rounded-full bg-indigo-500/5 blur-[90px] motion-reduce:hidden"
      />

      <div className="relative z-10 w-full max-w-[560px] mx-auto flex flex-col items-center">
        <LoginClientWrapper />
        <footer className="mt-8 text-center flex flex-col items-center gap-1 text-xs text-slate-400 font-medium tracking-tight">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span>Hệ thống Quản trị & Điều phối Vận tải LEOPARD</span>
          </div>
          <p className="text-[11px] text-slate-400/80">Phiên bản Pilot 2026 • NexaFleet Console</p>
        </footer>
      </div>
    </div>
  );
}
