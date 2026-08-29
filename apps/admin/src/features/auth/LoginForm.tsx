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
          className="mb-4 flex items-center gap-2.5 rounded-control border border-warning-border bg-warning p-3.5 text-xs text-warning-text"
        >
          <svg className="h-4 w-4 shrink-0 text-warning-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-control border border-danger-border bg-danger p-3.5 text-xs text-danger-text"
        >
          <svg className="h-4 w-4 shrink-0 text-danger-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label
            htmlFor="tokenInput"
            className="text-xs font-semibold text-neutral-text"
          >
            Số điện thoại hoặc Token
          </label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-muted group-focus-within:text-brand transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 5 12.91 19.79 19.79 0 0 1 2.07 4.3 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12 1.28.44 2.52.94 3.69a2 2 0 0 1-.57 2.11L8.09 10.91a16 16 0 0 0 6 6l1.39-1.39a2 2 0 0 1 2.11-.57c1.17.5 2.41.82 3.69.94A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <input
              id="tokenInput"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="Nhập số điện thoại (+84...) hoặc Token"
              className="w-full rounded-xl border border-neutral-border bg-neutral-surface/50 pl-10 pr-4 py-3 text-sm text-neutral-text placeholder-neutral-muted/70 shadow-sm transition-all focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          className="group relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-brand to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-brand transition-all hover:shadow-lg hover:from-brand-hover hover:to-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang xử lý...
            </span>
          ) : (
            <span className="flex items-center gap-2">Đăng nhập <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
          )}
        </button>
      </form>

      {allowDemo ? (
        <div className="mt-6">
          <div className="relative flex items-center justify-center gap-3 py-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-border to-transparent" />
            <span className="rounded-full bg-neutral-surface px-3 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-muted border border-neutral-border/50">
              Tài khoản demo — 1 click đăng nhập
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-border to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-1">
              {[
                { id: "admin", role: "ADMIN", title: "Demo Admin", desc: "Quản trị", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z", testId: "demo-admin-button" },
                { id: "fleet-owner", role: "FLEET_OWNER", title: "Demo Fleet Owner", desc: "Đội xe Sao Mai", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M16 3.13a4 4 0 0 1 0 7.74", testId: "demo-fleet-owner-button" },
                { id: "driver", role: "DRIVER", title: "Demo Driver", desc: "Tài xế", icon: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2h-2 M14 5h5v5", testId: undefined },
                { id: "customer", role: "CUSTOMER", title: "Demo Customer", desc: "Khách hàng", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 11v6", testId: undefined },
              ].map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  data-testid={acc.testId}
                  disabled={isSubmitting}
                  onClick={() => handleDemoLogin(acc.id, acc.role)}
                  className="group relative flex flex-col items-start gap-2 rounded-2xl border border-neutral-border bg-white p-3.5 text-left shadow-sm transition-all hover:border-brand/30 hover:shadow-md hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={acc.icon} /></svg>
                  </div>
                  <div className="relative">
                    <div className="text-xs font-bold text-neutral-text">{acc.title}</div>
                    <div className="text-[11px] text-neutral-muted">{acc.desc}</div>
                  </div>
                  <span className="relative rounded-full bg-neutral-surface px-2 py-0.5 text-[10px] font-bold tracking-wide text-neutral-muted border border-neutral-border/50 group-hover:bg-brand-soft group-hover:text-brand-soft-text group-hover:border-brand/20 transition-colors">
                    {acc.role}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
