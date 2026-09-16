"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
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

/* Vietnam flag SVG (inline, tiny) */
function VNFlag() {
  return (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="rounded-[2px] shrink-0"
    >
      <rect width="20" height="14" fill="#DA251D" />
      <polygon
        points="10,2.5 11.18,6.14 15,6.14 12.09,8.26 13.27,11.9 10,9.78 6.73,11.9 7.91,8.26 5,6.14 8.82,6.14"
        fill="#FFFF00"
      />
    </svg>
  );
}

export function LoginForm({
  allowDemo = process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH !== "false",
  sessionExpired = false,
  onSuccess,
  onRoleChange,
}: LoginFormProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
        res.session.accessTokenExpiresAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await setSession({
        userId: res.user.id,
        role: res.user.role,
        expiresAt,
      });

      onSuccess?.(res.user.role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMessage(err.message || "ThÃ´ng tin tÃ i khoáº£n khÃ´ng há»£p lá»‡");
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMessage(
            err.message || "Há»‡ thá»‘ng xÃ¡c thá»±c táº¡m thá»i khÃ´ng kháº£ dá»¥ng",
          );
        } else {
          setErrorMessage(err.message || "ÄÃ£ xáº£y ra lá»—i khi Ä‘Äƒng nháº­p");
        }
      } else {
        setErrorMessage("ÄÃ£ xáº£y ra lá»—i káº¿t ná»‘i máº¡ng");
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
        res.session.accessTokenExpiresAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await setSession({
        userId: res.user.id,
        role: res.user.role,
        expiresAt,
      });

      onSuccess?.(res.user.role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMessage(err.message || "TÃ i khoáº£n khÃ´ng há»£p lá»‡");
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMessage(
            err.message || "Há»‡ thá»‘ng xÃ¡c thá»±c táº¡m thá»i khÃ´ng kháº£ dá»¥ng",
          );
        } else {
          setErrorMessage(err.message || "ÄÃ£ xáº£y ra lá»—i khi Ä‘Äƒng nháº­p");
        }
      } else {
        setErrorMessage("ÄÃ£ xáº£y ra lá»—i káº¿t ná»‘i máº¡ng");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    "w-full bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/15 transition-all disabled:opacity-40";

  return (
    <div className="w-full flex flex-col gap-4">
      {sessionExpired && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-200"
        >
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-amber-400"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200"
        >
          <XCircle
            className="h-4 w-4 shrink-0 text-rose-400"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Phone input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tokenInput"
            className="text-xs font-medium text-white/50"
          >
            Số điện thoại hoặc Token
          </label>

          <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-white/25 focus-within:ring-1 focus-within:ring-white/15 transition-all">
            <div className="flex items-center gap-1.5 pl-3.5 pr-3 shrink-0 select-none">
              <VNFlag />
              <span className="text-xs font-semibold text-white/60">+84</span>
            </div>
            <div className="w-px h-5 bg-white/10 shrink-0" aria-hidden="true" />
            <input
              id="tokenInput"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="09xx xxx xxx"
              autoComplete="tel"
              className="flex-1 bg-transparent py-2.5 pl-3 pr-4 text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-40"
            />
          </div>
        </div>

        {/* Password input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="passwordInput"
            className="text-xs font-medium text-white/50"
          >
            Mật khẩu
          </label>

          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 text-white/30">
              <Lock className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <input
              id="passwordInput"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
              className={inputBase + " py-2.5 pl-10 pr-11"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={isSubmitting}
              className="absolute right-3 text-white/30 hover:text-white/60 transition-colors focus-visible:outline-none disabled:opacity-40"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" strokeWidth={1.8} />
              ) : (
                <Eye className="w-4 h-4" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="w-3.5 h-3.5 rounded border border-white/20 bg-white/5 accent-white cursor-pointer disabled:opacity-40"
            />
            <span className="text-xs text-white/45 group-hover:text-white/60 transition-colors">
              Ghi nhớ phiên
            </span>
          </label>

          <button
            type="button"
            disabled={isSubmitting}
            className="text-xs text-white/45 hover:text-white/70 transition-colors focus-visible:outline-none disabled:opacity-40"
          >
            Quên mật khẩu?
          </button>
        </div>

        {/* Primary CTA */}
        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          aria-label={isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
          className="group relative flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-slate-900 shadow-[0_4px_20px_rgba(255,255,255,0.12)] transition-all hover:bg-white/90 hover:shadow-[0_4px_24px_rgba(255,255,255,0.18)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none cursor-pointer mt-1"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Đang xử lý...</span>
            </span>
          ) : (
            <>
              <span>Đăng nhập vào hệ thống</span>
              <ArrowRight
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </form>

      {allowDemo && (
        <div className="mt-2 pt-4 border-t border-white/8 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
              Tài khoản demo
            </span>
            <span className="rounded bg-white/6 border border-white/8 px-2 py-0.5 text-[10px] font-medium text-white/30">
              Môi trường thử nghiệm
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              data-testid="demo-admin-button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("admin", "ADMIN")}
              onMouseEnter={() => onRoleChange?.("ADMIN")}
              onFocus={() => onRoleChange?.("ADMIN")}
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/8 p-3 text-left transition-all hover:bg-white/12 hover:border-white/18 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-mono font-bold text-white/80 tracking-wide">
                  ADMIN
                </span>
                <div className="min-w-0">
                  <span className="sr-only">Demo Admin</span>
                  <div className="text-xs font-bold text-white/80 leading-tight">Quản trị viên</div>
                  <div className="text-[11px] text-white/35">Toàn quyền điều phối & giám sát</div>
                  <span className="sr-only">+840000000004</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-white/30 group-hover:text-white/50 transition-colors">
                  +84 000 000 004
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/40" strokeWidth={2} />
              </div>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("driver", "DRIVER")}
              onMouseEnter={() => onRoleChange?.("DRIVER")}
              onFocus={() => onRoleChange?.("DRIVER")}
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 p-3 text-left transition-all hover:bg-white/10 hover:border-white/14 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded bg-white/10 border border-white/8 px-2 py-0.5 text-[10px] font-mono font-bold text-white/60 tracking-wide">
                  DRIVER
                </span>
                <div className="min-w-0">
                  <span className="sr-only">Demo Driver</span>
                  <div className="text-xs font-bold text-white/70 leading-tight">Tài xế</div>
                  <div className="text-[11px] text-white/30">Đội xe Sao Mai</div>
                  <span className="sr-only">+840000000002</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-white/25 group-hover:text-white/45 transition-colors">
                  +84 000 000 002
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-white/15 transition-transform group-hover:translate-x-0.5 group-hover:text-white/35" strokeWidth={2} />
              </div>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("customer", "CUSTOMER")}
              onMouseEnter={() => onRoleChange?.("CUSTOMER")}
              onFocus={() => onRoleChange?.("CUSTOMER")}
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 p-3 text-left transition-all hover:bg-white/10 hover:border-white/14 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded bg-white/10 border border-white/8 px-2 py-0.5 text-[10px] font-mono font-bold text-white/60 tracking-wide">
                  CUSTOMER
                </span>
                <div className="min-w-0">
                  <span className="sr-only">Demo Customer</span>
                  <div className="text-xs font-bold text-white/70 leading-tight">Khách hàng</div>
                  <div className="text-[11px] text-white/30">DN Vận tải Minh Phát</div>
                  <span className="sr-only">+840000000001</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-white/25 group-hover:text-white/45 transition-colors">
                  +84 000 000 001
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-white/15 transition-transform group-hover:translate-x-0.5 group-hover:text-white/35" strokeWidth={2} />
              </div>
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-white/22 pt-1">
        Cần hỗ trợ truy cập?{" "}
        <span className="text-white/40 font-medium">Liên hệ IT Helpdesk</span>
      </p>
    </div>
  );
}
