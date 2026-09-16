"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "../../../features/auth/LoginForm";

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
    <div className="w-full flex justify-center items-center py-2 sm:py-6">
      <div className="w-full max-w-[540px]">
        <div className="bg-white/98 backdrop-blur-xl rounded-2xl p-7 sm:p-9 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.03)] border border-slate-200/80 relative overflow-hidden">
          {/* Top hairline specular highlight */}
          <div
            className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-slate-300 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          {/* Integrated Enterprise Console Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="inline-flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">LEOPARD</span>
                <span className="rounded-full bg-slate-900 text-white text-[10px] font-semibold tracking-wide px-2.5 py-0.5">
                  Admin Console
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <span>Bàn điều phối</span>
              </div>
            </div>

            <div className="mt-4">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Cổng Điều Phối</h1>
              <p className="text-xs text-slate-500 font-normal mt-1">
                Đăng nhập tài khoản quản trị để truy cập hệ thống điều phối thông minh
              </p>
            </div>
          </div>

          <LoginForm
            sessionExpired={isExpired}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}

export function LoginClientWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-slate-400 font-medium text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          <span>Đang tải giao diện LEOPARD...</span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
