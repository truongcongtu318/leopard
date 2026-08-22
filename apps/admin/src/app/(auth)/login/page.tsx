import type { Metadata } from "next";
import { LoginClientWrapper } from "./LoginClientWrapper";

export const metadata: Metadata = {
  title: "Đăng nhập — LEOPARD Operations",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-neutral-surface px-4 py-8">
      <div className="w-full max-w-[460px] rounded-card border border-neutral-border bg-neutral p-5 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-text">
            LEOPARD Operations
          </h1>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-brand">
            Sổ điều phối vận hành logistics
          </p>
          <p className="mt-2 text-xs text-neutral-muted">
            Đăng nhập để quản lý đơn hàng, tài xế và toàn bộ đội xe
          </p>
        </div>

        <LoginClientWrapper />
      </div>

      <p className="mt-6 text-center text-xs text-neutral-muted">
        LEOPARD Pilot · Hệ điều phối logistics quy mô nhỏ
      </p>
    </div>
  );
}
