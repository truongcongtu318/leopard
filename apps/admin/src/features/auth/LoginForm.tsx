"use client";

import { useState } from "react";
import { browserClient } from "../../lib/api/browser-client";
import { setSession } from "../../lib/auth/session";
import { ApiError } from "../../lib/api/api-error";
import { TruckTransitOverlay } from "@leopard/ui";

export interface LoginFormProps {
  allowDemo?: boolean;
  sessionExpired?: boolean;
  onSuccess?: (role: string) => void;
  onRoleChange?: (role: "CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN") => void;
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
  allowDemo = process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH === "true",
  sessionExpired = false,
  onSuccess,
  onRoleChange,
}: LoginFormProps) {
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [selectedRole, setSelectedRole] = useState<"CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN">("CUSTOMER");
  const [tokenInput, setTokenInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [vehicleType, setVehicleType] = useState("TRUCK_15T");
  const [licensePlate, setLicensePlate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTransitActive, setIsTransitActive] = useState(false);

  const triggerTransit = (callback?: () => void) => {
    setIsTransitActive(true);
    callback?.();
    setTimeout(() => {
      setIsTransitActive(false);
    }, 900);
  };

  const handleRoleSelect = (role: "CUSTOMER" | "DRIVER" | "FLEET_OWNER" | "ADMIN") => {
    setSelectedRole(role);
    onRoleChange?.(role);
  };

  const handleModeSwitch = (mode: "LOGIN" | "REGISTER") => {
    if (authMode === mode) return;
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
    triggerTransit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (authMode === "REGISTER") {
      triggerTransit(() => {
        setIsSubmitting(false);
        setSuccessMessage(`Đăng ký tài khoản ${selectedRole} thành công! Đang chuyển sang đăng nhập...`);
        setTimeout(() => {
          setAuthMode("LOGIN");
          setSuccessMessage(null);
        }, 1200);
      });
      return;
    }

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

      triggerTransit(() => {
        onSuccess?.(res.user.role);
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMessage(err.message || "Thông tin đăng nhập không hợp lệ");
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMessage(err.message || "Hệ thống xác thực tạm thời không khả dụng");
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
    setSuccessMessage(null);

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

      triggerTransit(() => {
        onSuccess?.(res.user.role);
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.statusCode === 403) {
          setErrorMessage(err.message || "Tài khoản demo không hợp lệ");
        } else if (err.statusCode === 503 || err.statusCode === 0) {
          setErrorMessage(err.message || "Hệ thống xác thực tạm thời không khả dụng");
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
    <div className="w-full flex flex-col gap-4 text-left">
      {/* Full-screen truck transit effect */}
      <TruckTransitOverlay isActive={isTransitActive} />

      {/* Mode Switcher Tabs (Đăng Nhập / Đăng Ký) */}
      <div className="relative bg-[#EEF3F9] p-1 rounded-2xl border border-[#CAD9EB] flex items-center mb-1">
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#2E6FD6] rounded-xl shadow-sm transition-all duration-300 ease-out pointer-events-none"
          style={{ left: authMode === "LOGIN" ? "4px" : "calc(50% + 0px)" }}
        />
        <button
          type="button"
          onClick={() => handleModeSwitch("LOGIN")}
          className={`flex-1 py-2.5 text-center text-sm font-bold relative z-10 transition-colors ${
            authMode === "LOGIN" ? "text-white" : "text-[#5B6B80] hover:text-[#0B1F3A]"
          }`}
        >
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("REGISTER")}
          className={`flex-1 py-2.5 text-center text-sm font-bold relative z-10 transition-colors ${
            authMode === "REGISTER" ? "text-white" : "text-[#5B6B80] hover:text-[#0B1F3A]"
          }`}
        >
          Đăng Ký Mới
        </button>
      </div>

      {/* Role Selection Grid */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[#5B6B80] uppercase tracking-wider">
          Chọn vai trò của bạn
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleRoleSelect("CUSTOMER")}
            className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedRole === "CUSTOMER"
                ? "border-[#2E6FD6] bg-[#E0F2FE] shadow-xs"
                : "border-[#CAD9EB] bg-[#EEF3F9] hover:border-[#94A3B8]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">📦</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedRole === "CUSTOMER" ? "bg-[#2E6FD6]" : "bg-transparent"
                }`}
              />
            </div>
            <div className="font-bold text-xs text-[#0B1F3A]">Khách Hàng SME</div>
            <div className="text-[10px] text-[#5B6B80]">Tạo đơn & theo dõi</div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect("DRIVER")}
            className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedRole === "DRIVER"
                ? "border-[#16A34A] bg-[#DCFCE7] shadow-xs"
                : "border-[#CAD9EB] bg-[#EEF3F9] hover:border-[#94A3B8]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">🚚</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedRole === "DRIVER" ? "bg-[#16A34A]" : "bg-transparent"
                }`}
              />
            </div>
            <div className="font-bold text-xs text-[#0B1F3A]">Tài Xế Đối Tác</div>
            <div className="text-[10px] text-[#5B6B80]">Nhận cuốc xe tải</div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect("FLEET_OWNER")}
            className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedRole === "FLEET_OWNER"
                ? "border-[#D97706] bg-[#FEF3C7] shadow-xs"
                : "border-[#CAD9EB] bg-[#EEF3F9] hover:border-[#94A3B8]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">🏢</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedRole === "FLEET_OWNER" ? "bg-[#D97706]" : "bg-transparent"
                }`}
              />
            </div>
            <div className="font-bold text-xs text-[#0B1F3A]">Chủ Đội Xe</div>
            <div className="text-[10px] text-[#5B6B80]">Giám sát đoàn xe</div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect("ADMIN")}
            className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedRole === "ADMIN"
                ? "border-[#9333EA] bg-[#F3E8FF] shadow-xs"
                : "border-[#CAD9EB] bg-[#EEF3F9] hover:border-[#94A3B8]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">🛡️</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedRole === "ADMIN" ? "bg-[#9333EA]" : "bg-transparent"
                }`}
              />
            </div>
            <div className="font-bold text-xs text-[#0B1F3A]">Quản Trị Viên</div>
            <div className="text-[10px] text-[#5B6B80]">Kiểm soát hệ thống</div>
          </button>
        </div>
      </div>

      {sessionExpired ? (
        <div
          role="alert"
          className="p-3 bg-[#FEF3C7] border border-[#F59E0B] rounded-2xl text-[#92400E] text-xs text-center font-bold"
        >
          Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="p-3 bg-[#FEE2E2] border border-[#EF4444] rounded-2xl text-[#991B1B] text-xs text-center font-bold"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="p-3 bg-[#DCFCE7] border border-[#22C55E] rounded-2xl text-[#14532D] text-xs text-center font-bold"
        >
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Full Name for Registration */}
        {authMode === "REGISTER" && (
          <div className="flex flex-col gap-1 text-left">
            <label htmlFor="fullNameInput" className="text-xs font-bold text-[#0B1F3A]">
              Họ và tên
            </label>
            <input
              id="fullNameInput"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              placeholder="VD: Công ty TNHH Vận Tải Đông Nam"
              className="w-full bg-[#F8FAFC] border border-[#CAD9EB] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2E6FD6] focus:ring-2 focus:ring-[#2E6FD6]/20 transition-all"
            />
          </div>
        )}

        {/* Phone / Token Input */}
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="tokenInput" className="text-xs font-bold text-[#0B1F3A]">
            Số điện thoại hoặc Token
          </label>
          <input
            id="tokenInput"
            aria-label="Số điện thoại hoặc Token"
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            disabled={isSubmitting}
            placeholder="Nhập số điện thoại hoặc idToken..."
            className="w-full bg-[#F8FAFC] border border-[#CAD9EB] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] placeholder-[#94A3B8] font-mono focus:outline-none focus:border-[#2E6FD6] focus:ring-2 focus:ring-[#2E6FD6]/20 transition-all"
          />
        </div>

        {/* Driver specific info on Register */}
        {authMode === "REGISTER" && selectedRole === "DRIVER" && (
          <div className="p-3 bg-[#EEF3F9] border border-[#CAD9EB] rounded-2xl space-y-2 text-xs">
            <div className="font-bold text-[#0B1F3A] uppercase tracking-wider">
              🚚 Thông tin xe tải
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="vehicleSelect" className="text-[#5B6B80] block mb-1 font-semibold">Chủng loại xe</label>
                <select
                  id="vehicleSelect"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-white border border-[#CAD9EB] rounded-lg px-2 py-1.5 text-xs text-[#0B1F3A]"
                >
                  <option value="VAN">Xe Van (1 Tấn)</option>
                  <option value="TRUCK_5T">Xe Tải (5 Tấn)</option>
                  <option value="TRUCK_15T">Xe Tải Nặng (15 Tấn)</option>
                  <option value="CONTAINER">Đầu Kéo Container</option>
                  <option value="BAGAC">Xe Ba Gác</option>
                </select>
              </div>
              <div>
                <label htmlFor="licensePlateInput" className="text-[#5B6B80] block mb-1 font-semibold">Biển số xe</label>
                <input
                  id="licensePlateInput"
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="59D-123.45"
                  className="w-full bg-white border border-[#CAD9EB] rounded-lg px-2 py-1.5 text-xs text-[#0B1F3A] uppercase font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Primary CTA Button - Exactly matching Onboarding primaryCtaBtn */}
        <button
          type="submit"
          disabled={isSubmitting || !tokenInput.trim()}
          className={`w-full py-3.5 px-4 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
            isSubmitting || !tokenInput.trim()
              ? "bg-[#94A3B8] text-white cursor-not-allowed opacity-60"
              : "bg-gradient-to-b from-[#2E6FD6] to-[#1E5BB8] hover:from-[#2563EB] hover:to-[#1D4ED8] shadow-[#1E5BB8]/30 active:scale-[0.98] cursor-pointer"
          }`}
        >
          {isSubmitting ? (
            "Đang xử lý..."
          ) : authMode === "LOGIN" ? (
            "Đăng nhập"
          ) : (
            "Bắt đầu ngay"
          )}
        </button>
      </form>

      {/* Demo 1-Click Accounts */}
      {allowDemo ? (
        <div className="mt-4 pt-4 border-t border-[#CAD9EB] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5B6B80] uppercase tracking-wider">
              Tài khoản demo
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold border border-[#86EFAC]">
              Pilot Ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("customer", "CUSTOMER")}
              className="p-2.5 rounded-2xl bg-[#EEF3F9] hover:bg-[#E0F2FE] border border-[#CAD9EB] hover:border-[#2E6FD6] text-left transition-all flex items-center gap-2"
            >
              <span className="text-base">📦</span>
              <div>
                <div className="text-xs font-bold text-[#0B1F3A]">Demo Customer</div>
                <div className="text-[10px] text-[#5B6B80]">Khách hàng SME</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("driver", "DRIVER")}
              className="p-2.5 rounded-2xl bg-[#EEF3F9] hover:bg-[#DCFCE7] border border-[#CAD9EB] hover:border-[#16A34A] text-left transition-all flex items-center gap-2"
            >
              <span className="text-base">🚚</span>
              <div>
                <div className="text-xs font-bold text-[#0B1F3A]">Demo Driver</div>
                <div className="text-[10px] text-[#5B6B80]">Tài xế nhận đơn</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("fleet-owner", "FLEET_OWNER")}
              className="p-2.5 rounded-2xl bg-[#EEF3F9] hover:bg-[#FEF3C7] border border-[#CAD9EB] hover:border-[#D97706] text-left transition-all flex items-center gap-2"
            >
              <span className="text-base">🏢</span>
              <div>
                <div className="text-xs font-bold text-[#0B1F3A]">Demo Fleet Owner</div>
                <div className="text-[10px] text-[#5B6B80]">Quản lý đội xe</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDemoLogin("admin", "ADMIN")}
              className="p-2.5 rounded-2xl bg-[#EEF3F9] hover:bg-[#F3E8FF] border border-[#CAD9EB] hover:border-[#9333EA] text-left transition-all flex items-center gap-2"
            >
              <span className="text-base">🛡️</span>
              <div>
                <div className="text-xs font-bold text-[#0B1F3A]">Demo Admin</div>
                <div className="text-[10px] text-[#5B6B80]">Giám sát tổng quan</div>
              </div>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
