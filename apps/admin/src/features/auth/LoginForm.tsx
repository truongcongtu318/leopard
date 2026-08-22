"use client";

import { useState } from "react";
import { browserClient } from "../../lib/api/browser-client";
import { setSession } from "../../lib/auth/session";
import { ApiError } from "../../lib/api/api-error";

export interface LoginFormProps {
  allowDemo?: boolean;
  sessionExpired?: boolean;
  onSuccess?: (role: string) => void;
}

interface AuthResponse {
  user: {
    id: string;
    phone: string;
    role: "CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN";
    status: string;
  };
  session: {
    accessTokenExpiresAt: string;
  };
}

export function LoginForm({
  allowDemo = process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH !== "false",
  sessionExpired = false,
  onSuccess,
}: LoginFormProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await browserClient.post<AuthResponse>("/auth/firebase", {
        idToken: tokenInput,
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
          setErrorMessage(err.message || "Thông tin đăng nhập không hợp lệ");
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
          setErrorMessage(err.message || "Tài khoản demo không hợp lệ");
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMessage(
            err.message || "Hệ thống xác thực tạm thời không khả dụng",
          );
        } else {
          setErrorMessage(err.message || "Đã xảy ra lỗi khi đăng nhập demo");
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
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-xs text-amber-200"
        >
          <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200"
        >
          <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label
            htmlFor="tokenInput"
            className="text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            Số điện thoại hoặc Token
          </label>
          <div className="relative">
            <input
              id="tokenInput"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="Nhập số điện thoại (+84...) hoặc Token"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition-all hover:from-sky-500 hover:to-cyan-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang xử lý...
            </span>
          ) : (
            'Đăng nhập'
          )}
        </button>
      </form>

      {allowDemo ? (
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-slate-800" />
            <span className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">
              Tài khoản demo
            </span>
            <span className="h-px w-8 bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="demo-admin-button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("admin", "ADMIN")}
              className="group flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/50 p-3 text-left transition-all hover:border-sky-500/50 hover:bg-sky-950/30 hover:shadow-md cursor-pointer"
            >
              <div className="flex w-full items-center justify-between pointer-events-none">
                <span className="text-base">👑</span>
                <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[0.625rem] font-bold text-sky-400">ADMIN</span>
              </div>
              <span className="w-full text-xs font-semibold text-white group-hover:text-sky-300 pointer-events-none">
                Demo Admin
              </span>
              <span className="w-full text-[0.65rem] text-slate-400 pointer-events-none">
                Quản trị toàn hệ thống
              </span>
            </button>

            <button
              type="button"
              data-testid="demo-fleet-button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("fleet-owner", "FLEET_OWNER")}
              className="group flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/50 p-3 text-left transition-all hover:border-indigo-500/50 hover:bg-indigo-950/30 hover:shadow-md cursor-pointer"
            >
              <div className="flex w-full items-center justify-between pointer-events-none">
                <span className="text-base">🏢</span>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[0.625rem] font-bold text-indigo-400">FLEET</span>
              </div>
              <span className="w-full text-xs font-semibold text-white group-hover:text-indigo-300 pointer-events-none">
                Demo Fleet Owner
              </span>
              <span className="w-full text-[0.65rem] text-slate-400 pointer-events-none">
                Quản lý đội xe Sao Mai
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("driver", "DRIVER")}
              className="group flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/50 p-3 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-950/30 hover:shadow-md cursor-pointer"
            >
              <div className="flex w-full items-center justify-between pointer-events-none">
                <span className="text-base">🚗</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[0.625rem] font-bold text-emerald-400">DRIVER</span>
              </div>
              <span className="w-full text-xs font-semibold text-white group-hover:text-emerald-300 pointer-events-none">
                Demo Driver
              </span>
              <span className="w-full text-[0.65rem] text-slate-400 pointer-events-none">
                Tài xế nhận chuyến
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("customer", "CUSTOMER")}
              className="group flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/50 p-3 text-left transition-all hover:border-amber-500/50 hover:bg-amber-950/30 hover:shadow-md cursor-pointer"
            >
              <div className="flex w-full items-center justify-between pointer-events-none">
                <span className="text-base">📦</span>
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[0.625rem] font-bold text-amber-400">CLIENT</span>
              </div>
              <span className="w-full text-xs font-semibold text-white group-hover:text-amber-300 pointer-events-none">
                Demo Customer
              </span>
              <span className="w-full text-[0.65rem] text-slate-400 pointer-events-none">
                Tạo và theo dõi đơn
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
