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
    accessToken: string;
    accessTokenExpiresAt: string;
  };
}

export function LoginForm({
  allowDemo = process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH === "true",
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
        accessToken: res.session.accessToken,
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
        accessToken: res.session.accessToken,
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
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {sessionExpired ? (
        <div
          role="alert"
          style={{
            padding: "0.75rem",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "0.375rem",
            color: "#92400e",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          style={{
            padding: "0.75rem",
            backgroundColor: "#fee2e2",
            border: "1px solid #ef4444",
            borderRadius: "0.375rem",
            color: "#991b1b",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", textAlign: "left" }}>
          <label
            htmlFor="tokenInput"
            style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}
          >
            Số điện thoại hoặc Token
          </label>
          <input
            id="tokenInput"
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            disabled={isSubmitting}
            placeholder="Nhập số điện thoại hoặc idToken..."
            style={{
              padding: "0.625rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              fontSize: "0.875rem",
              color: "#111827",
              backgroundColor: isSubmitting ? "#f3f4f6" : "#ffffff",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: isSubmitting || !tokenInput.trim() ? "#9ca3af" : "#1d4ed8",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: isSubmitting || !tokenInput.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>

      {allowDemo ? (
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#6b7280",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Tài khoản demo
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("admin", "ADMIN")}
              style={{
                padding: "0.5rem",
                backgroundColor: "#f3f4f6",
                color: "#1f2937",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Demo Admin
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("fleet-owner", "FLEET_OWNER")}
              style={{
                padding: "0.5rem",
                backgroundColor: "#f3f4f6",
                color: "#1f2937",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Demo Fleet Owner
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("driver", "DRIVER")}
              style={{
                padding: "0.5rem",
                backgroundColor: "#f3f4f6",
                color: "#1f2937",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Demo Driver
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("customer", "CUSTOMER")}
              style={{
                padding: "0.5rem",
                backgroundColor: "#f3f4f6",
                color: "#1f2937",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Demo Customer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
