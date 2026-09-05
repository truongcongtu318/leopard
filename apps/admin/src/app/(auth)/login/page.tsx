import type { Metadata } from "next";
import { ShieldCheck } from 'lucide-react';
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#d6e8fb] via-[#fbf6de] to-[#fef3ca] px-4 py-10 overflow-hidden">
      {/* Decorative ambient blurred shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl motion-reduce:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl motion-reduce:hidden"
      />

      <div className="relative z-10 w-full max-w-[28rem]">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-[#0d5ca8] text-white shadow-xs">
            <ShieldCheck className="w-[22px] h-[22px]" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-extrabold tracking-tight text-neutral-text">LEOPARD</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand-soft/60 px-2 py-0.5 text-[10px] font-bold text-brand">
                Pilot
              </span>
            </div>
            <p className="text-xs text-neutral-muted">Cổng điều phối vận tải trực tuyến</p>
          </div>
        </div>

        <main className="rounded-[28px] sm:rounded-[32px] border border-white/80 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-card text-neutral-text">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-text">Đăng nhập tài khoản</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-muted">
            Truy cập cổng vận hành và điều phối logistics
          </p>
          <div className="mt-5">
            <LoginClientWrapper />
          </div>
        </main>

        <p className="mt-6 text-center text-xs text-neutral-muted">
          Hệ thống Quản trị & Điều phối Vận tải LEOPARD
        </p>
      </div>
    </div>
  );
}
