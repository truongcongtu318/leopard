"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
    <div className="w-full flex justify-center items-center py-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-black/[0.06] relative">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">LEOPARD</span>
              <span className="rounded-full bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5">Admin</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Cổng Điều Phối</h1>
            <p className="text-xs text-slate-400 font-normal mt-1">
              Đăng nhập tài khoản quản trị để truy cập hệ thống
            </p>
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
        <div className="min-h-[400px] flex items-center justify-center text-slate-400 font-medium text-xs">
          Đang tải giao diện LEOPARD...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
