"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LoginForm } from "../../../features/auth/LoginForm";
import { TruckDrivebyScene } from "@leopard/ui";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get("expired") === "true";
  const [activeRole, setActiveRole] = useState<"CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN">("CUSTOMER");

  const handleSuccess = (role: string) => {
    switch (role) {
      case "ADMIN":
        router.push("/admin");
        break;
      case "FLEET_OWNER":
        router.push("/fleet");
        break;
      case "CUSTOMER":
        router.push("/customer/orders");
        break;
      case "DRIVER":
        router.push("/driver/orders");
        break;
      default:
        router.push("/admin");
        break;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6 px-4 sm:px-6">
      {/* LEFT COLUMN: DYNAMIC LOGISTICS STAGE (Highways, Heavy Truck, Animated Route) */}
      <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] text-xs font-bold">
            <svg className="w-4 h-4 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Nền Tảng Vận Tải Trọng Tải Lớn & Vừa Thông Minh
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1F3A] leading-tight tracking-tight">
            Vận Chuyển Hàng Hóa &<br />
            <span className="bg-gradient-to-r from-[#2E6FD6] via-[#1E5BB8] to-[#0284C7] bg-clip-text text-transparent">
              Vật Liệu Thông Minh
            </span>
          </h1>
          <p className="text-[#5B6B80] text-sm sm:text-base max-w-xl font-medium leading-relaxed">
            Điều phối tức thì · Định vị GPS realtime · Tối ưu ghép hàng rỗng VRP giảm 35% chi phí cho Doanh nghiệp SME & Đội xe công trình.
          </p>
        </div>

        {/* 3D Elevated Highway & Running Truck Scene */}
        <TruckDrivebyScene role={activeRole} showWaypoints={true} />

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-white border border-[#CAD9EB] shadow-xs">
            <div className="text-[#0B1F3A] font-extrabold text-lg sm:text-xl font-mono">30 Tấn</div>
            <div className="text-[11px] text-[#5B6B80] font-semibold">Trọng tải tối đa</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-[#CAD9EB] shadow-xs">
            <div className="text-[#2E6FD6] font-extrabold text-lg sm:text-xl font-mono">&lt; 30s</div>
            <div className="text-[11px] text-[#5B6B80] font-semibold">Tìm tài xế phù hợp</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-[#CAD9EB] shadow-xs">
            <div className="text-[#16A34A] font-extrabold text-lg sm:text-xl font-mono">-35%</div>
            <div className="text-[11px] text-[#5B6B80] font-semibold">Chi phí ghép hàng</div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: REFINED AUTH CARD */}
      <div className="lg:col-span-5 w-full">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#CAD9EB] relative overflow-hidden">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-[#0B1F3A]">LEOPARD Operations</h2>
            <p className="text-xs text-[#5B6B80] font-medium">
              Đăng nhập hoặc đăng ký tài khoản để truy cập hệ thống
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
        <div className="min-h-screen flex items-center justify-center text-[#5B6B80] font-medium">
          Đang tải giao diện LEOPARD...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
