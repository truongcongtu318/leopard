"use client";

import { ApiError } from "../../lib/api/api-error";
import { browserClient } from "../../lib/api/browser-client";

import type { AdminCommandView } from "./model";

/**
 * Executes admin commands against the real API through the BFF proxy
 * (`/api/v1/[...path]`), which attaches the Bearer token from the httpOnly
 * cookie, refreshes on 401 and enforces same-origin CSRF.
 */

export type CommandExecutionResult =
  | { state: "success"; message: string }
  | { state: "invalid"; reasonError: string }
  | { state: "conflict"; message: string }
  | { state: "error" | "permission-denied" | "session-expired"; message: string };

function clientRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual generator
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function reasonErrorFromDetails(details: unknown, fallback: string): string {
  if (details && typeof details === "object") {
    const fields = (details as { fields?: unknown }).fields;
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (
          field &&
          typeof field === "object" &&
          Array.isArray((field as { messages?: unknown }).messages)
        ) {
          const messages = (field as { messages?: unknown[] }).messages;
          const first = messages?.find((m): m is string => typeof m === "string");
          if (first) return first;
        }
      }
    }
  }
  return fallback;
}

export async function executeAdminCommand(
  command: AdminCommandView,
  reason: string,
): Promise<CommandExecutionResult> {
  try {
    if (command.kind === "DISABLE_USER" || command.kind === "ENABLE_USER") {
      await browserClient.patch(`/admin/users/${command.targetId}/status`, {
        status: command.kind === "DISABLE_USER" ? "DISABLED" : "ACTIVE",
        reason,
        clientRequestId: clientRequestId(),
      });
      return {
        state: "success",
        message:
          command.kind === "DISABLE_USER"
            ? "Backend đã vô hiệu hóa người dùng."
            : "Backend đã kích hoạt lại người dùng.",
      };
    }

    if (command.kind === "CANCEL_ORDER") {
      await browserClient.post(`/orders/${command.targetId}/cancel`, { reason });
      return {
        state: "success",
        message: `Đơn ${command.targetLabel} đã được backend xác nhận hủy.`,
      };
    }

    // CONFIRM_MANUAL_PAYMENT
    await browserClient.post(`/admin/payments/${command.targetId}/confirm`, {
      note: reason,
      clientRequestId: clientRequestId(),
    });
    return {
      state: "success",
      message: "Thanh toán đã được backend xác nhận thủ công kèm audit.",
    };
  } catch (error) {
    if (!ApiError.isApiError(error)) {
      return { state: "error", message: "Không thể kết nối máy chủ. Vui lòng thử lại." };
    }
    if (error.statusCode === 422) {
      return {
        state: "invalid",
        reasonError: reasonErrorFromDetails(error.details, error.message),
      };
    }
    if (error.statusCode === 409) {
      return { state: "conflict", message: error.message };
    }
    if (error.statusCode === 403) {
      return { state: "permission-denied", message: error.message };
    }
    if (error.statusCode === 401) {
      return { state: "session-expired", message: "Phiên đã hết hạn. Vui lòng đăng nhập lại." };
    }
    return {
      state: "error",
      message: error.requestId
        ? `${error.message} (Mã theo dõi: ${error.requestId})`
        : error.message,
    };
  }
}
