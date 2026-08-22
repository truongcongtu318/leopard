import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[460px] rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-3xl shadow-lg shadow-sky-500/20">
            🐆
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            LEOPARD Operations
          </h1>
          <p className="mt-1.5 text-[0.7rem] sm:text-xs font-medium uppercase tracking-widest text-sky-400">
            SỔ ĐIỀU PHỐI VẬN HÀNH LOGISTICS
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Đăng nhập để quản lý đơn hàng, tài xế và toàn bộ đội xe
          </p>
        </div>

        <LoginClientWrapper />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        LEOPARD Pilot Engine · Mini-Production Logistics Baseline
      </p>
    </div>
  );
}

