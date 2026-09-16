"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Phone,
  XCircle,
} from "lucide-react";
import { browserClient } from "../../lib/api/browser-client";
import { setSession } from "../../lib/auth/session";
import { ApiError } from "../../lib/api/api-error";

export interface LoginFormProps {
  allowDemo?: boolean;
  sessionExpired?: boolean;
  onSuccess?: (role: string) => void;
  onRoleChange?: (role: "CUSTOMER" | "DRIVER" | "ADMIN") => void;
}

interface AuthResponse {
  user: {
    id: string;
    phone: string;
    role: "CUSTOMER" | "DRIVER" | "ADMIN";
    status: string;
  };
  session: {
    accessTokenExpiresAt: string;
  };
}

const DEMO_ACCOUNT_MAP: Record<string, string> = {
  admin: "admin",
  driver: "driver",
  customer: "customer",
  "+840000000004": "admin",
  "+840000000002": "driver",
  "+840000000001": "customer",
  "0900000004": "admin",
  "0900000002": "driver",
  "0900000001": "customer",
};

export function LoginForm({
  allowDemo = process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH !== "false",
  sessionExpired = false,
  onSuccess,
  onRoleChange,
}: LoginFormProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const input = tokenInput.trim();
    const demoAccountId = DEMO_ACCOUNT_MAP[input.toLowerCase()];
    const endpoint = demoAccountId ? "/auth/login/demo" : "/auth/firebase";
    const payload = demoAccountId ? { accountId: demoAccountId } : { idToken: input };

    try {
      const res = await browserClient.post<AuthResponse>(endpoint, payload);

      const expiresAt =
        res.session.accessTokenExpiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await setSession({
        userId: res.user.id,
        role: res.user.role,
        expiresAt,
      });

      onSuccess?.(res.user.role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMessage(err.message || "Thông tin tài khoản không hợp lệ");
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMessage(
            err.message || "Hệ thống xác thực tạm thời không khả dụng",
          );
        } else {
          setErrorMessage(err.message || "Đã xảy ra lỗi khi đăng nhập");
        }
      } else {
        setErrorMessage("Đã xảy ra lỗi kết nối mạng");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (accountId: string, defaultRole: string) => {
    if (isSubmitting) return;

    onRoleChange?.(defaultRole as "CUSTOMER" | "DRIVER" | "ADMIN");
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await browserClient.post<AuthResponse>("/auth/login/demo", {
        accountId,
      });

      const expiresAt =
        res.session.accessTokenExpiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await setSession({
        userId: res.user.id,
        role: res.user.role,
        expiresAt,
      });

      onSuccess?.(res.user.role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMessage(err.message || "Tài khoản không hợp lệ");
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMessage(
            err.message || "Hệ thống xác thực tạm thời không khả dụng",
          );
        } else {
          setErrorMessage(err.message || "Đã xảy ra lỗi khi đăng nhập");
        }
      } else {
        setErrorMessage("Đã xảy ra lỗi kết nối mạng");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {sessionExpired ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-xs text-amber-900 shadow-2xs"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.8} aria-hidden="true" />
          <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-rose-200/90 bg-rose-50/70 p-3 text-xs text-rose-900 shadow-2xs"
        >
          <XCircle className="h-4 w-4 shrink-0 text-rose-600" strokeWidth={1.8} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5 text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor="tokenInput"
              className="text-xs font-semibold text-slate-700"
            >
              Số điện thoại hoặc Token
            </label>
            <span className="text-[11px] text-slate-400 font-mono">Firebase / Dev Token</span>
          </div>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-slate-700 transition-colors">
              <Phone className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <input
              id="tokenInput"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="Nhập số điện thoại (VD: +840000000004) hoặc Token"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white focus:bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 font-mono shadow-2xs transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white shadow-xs transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 motion-reduce:transition-none cursor-pointer"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Đang xử lý...</span>
            </span>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {allowDemo ? (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Tài khoản demo (truy cập nhanh)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">3 vai trò</span>
            </div>
            <span className="rounded bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              Môi trường thử nghiệm
            </span>
          </div>

          {/* Technical Role Matrix */}
          <div className="flex flex-col gap-2">
            {/* Admin Role Row */}
            <button
              type="button"
              data-testid="demo-admin-button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("admin", "ADMIN")}
              onMouseEnter={() => onRoleChange?.("ADMIN")}
              onFocus={() => onRoleChange?.("ADMIN")}
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-900 p-3 text-left text-white shadow-2xs transition-all hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-mono font-bold text-white tracking-wide">
                  ADMIN
                </span>
                <div className="min-w-0">
                  <span className="sr-only">Demo Admin</span>
                  <div className="text-xs font-bold leading-tight">Quản trị viên</div>
                  <div className="text-[11px] text-slate-300">Toàn quyền điều phối & giám sát</div>
                  <span className="sr-only">+840000000004</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-slate-300 group-hover:text-white transition-colors">
                  +84 000 000 004
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" strokeWidth={2} />
              </div>
            </button>

            {/* Driver Role Row */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("driver", "DRIVER")}
              onMouseEnter={() => onRoleChange?.("DRIVER")}
              onFocus={() => onRoleChange?.("DRIVER")}
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-left transition-all hover:border-slate-300 hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded bg-slate-200/70 border border-slate-300/60 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 tracking-wide">
                  DRIVER
                </span>
                <div className="min-w-0">
                  <span className="sr-only">Demo Driver</span>
                  <div className="text-xs font-bold text-slate-800 leading-tight">Tài xế</div>
                  <div className="text-[11px] text-slate-500">Đội xe Sao Mai</div>
                  <span className="sr-only">+840000000002</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-slate-500 group-hover:text-slate-800 transition-colors">
                  +84 000 000 002
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" strokeWidth={2} />
              </div>
            </button>

            {/* Customer Role Row */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("customer", "CUSTOMER")}
              onMouseEnter={() => onRoleChange?.("CUSTOMER")}
              onFocus={() => onRoleChange?.("CUSTOMER")}
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-left transition-all hover:border-slate-300 hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded bg-slate-200/70 border border-slate-300/60 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 tracking-wide">
                  CUSTOMER
                </span>
                <div className="min-w-0">
                  <span className="sr-only">Demo Customer</span>
                  <div className="text-xs font-bold text-slate-800 leading-tight">Khách hàng</div>
                  <div className="text-[11px] text-slate-500">DN Vận tải Minh Phát</div>
                  <span className="sr-only">+840000000001</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-slate-500 group-hover:text-slate-800 transition-colors">
                  +84 000 000 001
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" strokeWidth={2} />
              </div>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
