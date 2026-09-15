"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LoginForm } from "../../../features/auth/LoginForm";
import { TruckDrivebyScene } from "@leopard/ui";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get("expired") === "true";
  const [activeRole, setActiveRole] = useState<"CUSTOMER" | "DRIVER" | "ADMIN">("ADMIN");

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
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-4 sm:py-8">
      {/* LEFT COLUMN: DYNAMIC LOGISTICS STAGE */}
      <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-black/[0.06] text-sky-700 text-xs font-semibold shadow-xs backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            Nền Tảng Vận Tải Trọng Tải Lớn & Vừa Thông Minh
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Vận Chuyển Hàng Hóa &<br />
            <span className="text-sky-600">
              Vật Liệu Thông Minh
            </span>
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl font-normal leading-relaxed">
            Điều phối tức thì · Định vị GPS realtime · Tối ưu ghép hàng rỗng VRP giảm 35% chi phí cho Doanh nghiệp SME & Đội xe công trình.
          </p>
        </div>

        {/* Highway & Running Truck Scene */}
        <div className="rounded-3xl border border-black/[0.06] bg-white/70 backdrop-blur-xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <TruckDrivebyScene role={activeRole} showWaypoints={true} />
        </div>

        {/* Key Metrics Strip: Apple Widget style */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-black/[0.06] shadow-xs">
            <div className="text-slate-900 font-bold text-lg sm:text-xl font-mono tabular-nums">30 Tấn</div>
            <div className="text-[11px] text-slate-400 font-medium">Trọng tải tối đa</div>
          </div>
          <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-black/[0.06] shadow-xs">
            <div className="text-sky-600 font-bold text-lg sm:text-xl font-mono tabular-nums">&lt; 30s</div>
            <div className="text-[11px] text-slate-400 font-medium">Tìm tài xế phù hợp</div>
          </div>
          <div className="p-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-black/[0.06] shadow-xs">
            <div className="text-emerald-600 font-bold text-lg sm:text-xl font-mono tabular-nums">-35%</div>
            <div className="text-[11px] text-slate-400 font-medium">Chi phí ghép hàng</div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: REFINED AUTH CARD */}
      <div className="lg:col-span-5 w-full">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-black/[0.06] relative">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">LEOPARD</span>
              <span className="rounded-full bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5">Admin</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Cổng Điều Phối</h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              Đăng nhập tài khoản quản trị để truy cập hệ thống
            </p>
          </div>
          <LoginForm
            sessionExpired={isExpired}
            onSuccess={handleSuccess}
            onRoleChange={setActiveRole}
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
