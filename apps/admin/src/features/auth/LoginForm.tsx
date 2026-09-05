"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Phone, XCircle } from 'lucide-react';
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

const DEMO_ACCOUNT_MAP: Record<string, string> = {
  admin: "admin",
  "fleet-owner": "fleet-owner",
  driver: "driver",
  customer: "customer",
  "+840000000004": "admin",
  "+840000000003": "fleet-owner",
  "+840000000002": "driver",
  "+840000000001": "customer",
  "0900000004": "admin",
  "0900000003": "fleet-owner",
  "0900000002": "driver",
  "0900000001": "customer",
};

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
          className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-2xs backdrop-blur-xs"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden="true" />
          <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900 shadow-2xs backdrop-blur-xs"
        >
          <XCircle className="h-4 w-4 shrink-0 text-rose-600" strokeWidth={2} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label
            htmlFor="tokenInput"
            className="text-xs font-semibold text-slate-700"
          >
            Số điện thoại hoặc Token
          </label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-brand transition-colors">
              <Phone className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <input
              id="tokenInput"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="Nhập số điện thoại (VD: +840000000004) hoặc Token"
              className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 pl-10 text-sm text-neutral-text placeholder:text-slate-400 shadow-2xs transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Đang xử lý...
            </span>
          ) : (
            <span className="flex items-center gap-2">Đăng nhập <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></span>
          )}
        </button>
      </form>

      {allowDemo ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-700">
              <span className="sr-only">Tài khoản demo</span>
              Đăng nhập nhanh theo vai trò hệ thống
            </p>
            <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Môi trường thử nghiệm
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
                { id: "admin", role: "ADMIN", title: "Quản trị viên", testLabel: "Demo Admin", desc: "Hệ thống LEOPARD", phone: "+840000000004", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z", testId: "demo-admin-button" },
                { id: "fleet-owner", role: "FLEET_OWNER", title: "Chủ đội xe", testLabel: "Demo Fleet Owner", desc: "Đội xe Sao Mai", phone: "+840000000003", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M16 3.13a4 4 0 0 1 0 7.74", testId: "demo-fleet-owner-button" },
                { id: "driver", role: "DRIVER", title: "Tài xế", testLabel: "Demo Driver", desc: "Đội xe Sao Mai", phone: "+840000000002", icon: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2h-2 M14 5h5v5", testId: undefined },
                { id: "customer", role: "CUSTOMER", title: "Khách hàng", testLabel: "Demo Customer", desc: "DN Minh Phát", phone: "+840000000001", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 11v6", testId: undefined },
              ].map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  data-testid={acc.testId}
                  disabled={isSubmitting}
                  onClick={() => handleDemoLogin(acc.id, acc.role)}
                  className="group flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200/80 bg-[#f8fbff] p-3 text-left transition-all hover:border-brand/40 hover:bg-white hover:shadow-xs active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={acc.icon} /></svg>
                    </div>
                    <span className="rounded-full border border-slate-200/80 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                      {acc.role === 'ADMIN' ? 'Admin' : acc.role === 'FLEET_OWNER' ? 'Fleet' : acc.role === 'DRIVER' ? 'Tài xế' : 'Khách'}
                    </span>
                  </div>
                  <div>
                    <span className="sr-only">{acc.testLabel}</span>
                    <div className="text-xs font-bold text-slate-800">{acc.title}</div>
                    <div className="text-[11px] text-slate-400">{acc.desc}</div>
                    <span className="sr-only">{acc.phone}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
