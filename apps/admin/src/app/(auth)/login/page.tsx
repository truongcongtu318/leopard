import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#F5F5F7] px-4 py-8 overflow-x-hidden antialiased">
      {/* Apple 2026 Ambient Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-[32rem] w-[32rem] rounded-full bg-sky-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-[32rem] w-[32rem] rounded-full bg-amber-200/20 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <LoginClientWrapper />
        <footer className="mt-8 text-center text-xs text-slate-400 font-medium tracking-tight">
          Hệ thống Quản trị & Điều phối Vận tải LEOPARD
        </footer>
      </div>
    </div>
  );
}
