import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden antialiased selection:bg-amber-400/30 selection:text-white"
      style={{ background: "#0a0f1e" }}
    >
      {/* ── Brick wall texture ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60'%3E%3Crect x='1' y='1' width='118' height='27' rx='2' fill='none' stroke='rgba(255,255,255,0.038)' stroke-width='1'/%3E%3Crect x='61' y='32' width='58' height='27' rx='2' fill='none' stroke='rgba(255,255,255,0.038)' stroke-width='1'/%3E%3Crect x='1' y='32' width='58' height='27' rx='2' fill='none' stroke='rgba(255,255,255,0.038)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 60px",
        }}
      />

      {/* ── Darken top & bottom edges ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04060f] via-transparent to-[#04060f]/70"
      />

      {/* ── Ambient warm glow — wide halo ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: "700px",
          height: "520px",
          background:
            "radial-gradient(ellipse 55% 55% at 50% 0%, rgba(251,191,36,0.16) 0%, rgba(245,158,11,0.06) 50%, transparent 70%)",
        }}
      />

      {/* ── Tight hot-spot glow directly under lamp ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: "260px",
          height: "260px",
          background:
            "radial-gradient(ellipse 70% 55% at 50% 8%, rgba(254,240,138,0.14) 0%, transparent 70%)",
        }}
      />

      {/* ── Page content ── */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto flex flex-col items-center px-4 py-10">
        <LoginClientWrapper />

        <footer className="mt-6 text-center flex flex-col items-center gap-1.5">
          <div className="inline-flex items-center gap-2 text-xs text-white/25 font-medium tracking-tight">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
              aria-hidden="true"
            />
            <span>Hệ thống Quản trị &amp; Điều phối Vận tải LEOPARD</span>
          </div>
          <p className="text-[11px] text-white/15">
            Phiên bản Pilot 2026 • NexaFleet Console
          </p>
        </footer>
      </div>
    </div>
  );
}
