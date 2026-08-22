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
            className="text-xs font-semibold text-neutral-muted"
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
              className="w-full rounded-control border border-neutral-border bg-neutral px-4 py-3 text-sm text-neutral-text placeholder-neutral-muted/70 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          className="flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="mt-6 border-t border-neutral-border pt-5">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-neutral-border" />
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-muted">
              Tài khoản demo
            </span>
            <span className="h-px w-8 bg-neutral-border" />
          </div>

          <div className="grid gap-2">
              <button
                type="button"
                data-testid="demo-admin-button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("admin", "ADMIN")}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-control border border-neutral-border bg-neutral px-3 py-2 text-left transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-neutral-text">Demo Admin</span>
                  <span className="block text-xs text-neutral-muted">Quản trị toàn hệ thống</span>
                </span>
                <span className="ml-2 shrink-0 rounded-pill bg-brand-soft px-1.5 py-0.5 text-xs font-bold text-brand-soft-text">
                  ADMIN
                </span>
              </button>
              <button
                type="button"
                data-testid="demo-fleet-owner-button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("fleet-owner", "FLEET_OWNER")}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-control border border-neutral-border bg-neutral px-3 py-2 text-left transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-neutral-text">Demo Fleet Owner</span>
                  <span className="block text-xs text-neutral-muted">Quản lý đội xe Sao Mai</span>
                </span>
                <span className="ml-2 shrink-0 rounded-pill bg-brand-soft px-1.5 py-0.5 text-xs font-bold text-brand-soft-text">
                  FLEET_OWNER
                </span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("driver", "DRIVER")}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-control border border-neutral-border bg-neutral px-3 py-2 text-left transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-neutral-text">Demo Driver</span>
                  <span className="block text-xs text-neutral-muted">Tài xế nhận chuyến</span>
                </span>
                <span className="ml-2 shrink-0 rounded-pill bg-brand-soft px-1.5 py-0.5 text-xs font-bold text-brand-soft-text">
                  DRIVER
                </span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("customer", "CUSTOMER")}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-control border border-neutral-border bg-neutral px-3 py-2 text-left transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-neutral-text">Demo Customer</span>
                  <span className="block text-xs text-neutral-muted">Tạo và theo dõi đơn</span>
                </span>
                <span className="ml-2 shrink-0 rounded-pill bg-brand-soft px-1.5 py-0.5 text-xs font-bold text-brand-soft-text">
                  CUSTOMER
                </span>
              </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
