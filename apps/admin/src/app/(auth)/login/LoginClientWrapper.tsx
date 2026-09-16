"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "../../../features/auth/LoginForm";

/* ─────────────────────────────────────────────────────────────────
   Industrial wall-sconce lamp rendered as inline SVG + CSS glow
───────────────────────────────────────────────────────────────── */
function WallLamp() {
  return (
    <div className="relative flex flex-col items-center" aria-hidden="true">
      <svg
        width="88"
        height="72"
        viewBox="0 0 88 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wall bracket arm */}
        <rect x="36" y="0" width="16" height="10" rx="3" fill="#475569" />
        <rect x="40" y="10" width="8" height="6" rx="1" fill="#334155" />

        {/* Lamp shade (trapezoid) */}
        <path d="M10 16 L78 16 L64 58 L24 58 Z" fill="#1e293b" />
        <path d="M10 16 L78 16 L74 22 L14 22 Z" fill="#334155" />

        {/* Bottom rim */}
        <rect x="21" y="56" width="46" height="5" rx="2.5" fill="#475569" />

        {/* Bulb glow */}
        <circle cx="44" cy="38" r="7" fill="rgba(253,224,71,0.95)" />
        <circle cx="44" cy="38" r="13" fill="rgba(251,191,36,0.18)" />
        <circle cx="44" cy="38" r="20" fill="rgba(245,158,11,0.07)" />

        {/* Shade highlight */}
        <path
          d="M14 22 L74 22 L70 26 L18 26 Z"
          fill="rgba(255,255,255,0.06)"
        />
      </svg>

      {/* Glow cone radiating downward from lamp */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[98%] pointer-events-none"
        style={{
          width: "320px",
          height: "160px",
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(251,191,36,0.32) 0%, rgba(245,158,11,0.10) 55%, transparent 100%)",
          filter: "blur(6px)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Inner content (must be inside Suspense for useSearchParams)
───────────────────────────────────────────────────────────────── */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get("expired") === "true";

  const handleSuccess = (role: string) => {
    const target =
      role === "ADMIN"
        ? "/admin"
        : role === "CUSTOMER"
          ? "/customer/orders"
          : role === "DRIVER"
            ? "/driver/orders"
            : "/admin";
    router.push(target);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Lamp sits above the card */}
      <WallLamp />

      {/* ── Glassmorphism login card ── */}
      <div className="w-full relative mt-0">
        <div
          className="
            relative overflow-hidden w-full
            bg-slate-900/40 backdrop-blur-xl
            rounded-2xl
            border border-white/10
            shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]
            p-7 sm:p-9
          "
        >
          {/* Top specular hairline */}
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          {/* Warm light wash from lamp above — subtle amber tint at top of card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: "280px",
              height: "120px",
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 75%)",
            }}
          />

          {/* ── LEOPARD brand header ── */}
          <div className="mb-7 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="font-extrabold text-xl tracking-tight text-white leading-none">
                LEOPARD
              </span>
              <span className="rounded-full bg-white/10 border border-white/10 text-white/70 text-[10px] font-semibold tracking-widest px-2.5 py-0.5 uppercase">
                Admin Console
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Đăng nhập
            </h1>
            <p className="text-sm text-white/40 mt-1.5 font-normal">
              Truy cập cổng quản trị &amp; điều phối vận tải
            </p>
          </div>

          <LoginForm sessionExpired={isExpired} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Public export — wraps content in Suspense for RSC safety
───────────────────────────────────────────────────────────────── */
export function LoginClientWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-white/30 font-medium text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/50" />
          <span>Đang tải giao diện LEOPARD...</span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

